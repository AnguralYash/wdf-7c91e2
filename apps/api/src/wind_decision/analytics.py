from collections import defaultdict
from collections.abc import Iterable, Sequence
from datetime import UTC, date, datetime, time, timedelta
from math import fsum, sqrt

from wind_decision.models import (
    AccuracyMetrics,
    ActualRecord,
    AnalysisSnapshot,
    DailySummary,
    DataSources,
    DayAnalysis,
    ForecastRecord,
    HalfHourlyActual,
    HourlyComparison,
    PeriodSummary,
)

DECISION_CUTOFF = time(hour=15, minute=30, tzinfo=UTC)
FORECAST_SOURCE = "https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream"
ACTUAL_SOURCE = "https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream"
ASSUMPTIONS = (
    "Decision dates run from 1 to 31 January 2026; delivery is the next day.",
    "The EPEX half-hour day-ahead auction closes at 15:30 GMT.",
    "Only forecasts published strictly before the decision cutoff are eligible.",
    "Two half-hour actual values are averaged for each hourly comparison.",
    "Error is forecast minus actual; positive bias means wind was over-forecast.",
)


class DataQualityError(ValueError):
    """Raised when source data cannot support a trustworthy comparison."""


def _utc_at(day: date, value: time) -> datetime:
    return datetime.combine(day, value).astimezone(UTC)


def _expected_starts(day: date, interval_minutes: int) -> tuple[datetime, ...]:
    start = datetime.combine(day, time.min, tzinfo=UTC)
    periods = 24 * 60 // interval_minutes
    return tuple(
        start + timedelta(minutes=interval_minutes * index) for index in range(periods)
    )


def _validate_exact_starts(
    starts: Iterable[datetime],
    expected: tuple[datetime, ...],
    label: str,
) -> None:
    actual = tuple(sorted(starts))
    if actual != expected:
        missing = sorted(set(expected) - set(actual))
        duplicates = len(actual) - len(set(actual))
        unexpected = sorted(set(actual) - set(expected))
        raise DataQualityError(
            f"{label} timestamps are incomplete or invalid "
            f"(missing={len(missing)}, unexpected={len(unexpected)}, "
            f"duplicates={duplicates})"
        )


def select_latest_forecast(
    forecasts: Sequence[ForecastRecord],
    decision_date: date,
) -> tuple[datetime, tuple[ForecastRecord, ...]]:
    """Select the latest complete next-day forecast available before cutoff."""

    delivery_date = decision_date + timedelta(days=1)
    cutoff = _utc_at(decision_date, DECISION_CUTOFF)
    relevant = tuple(
        record
        for record in forecasts
        if record.publish_time.date() == decision_date
        and record.publish_time < cutoff
        and record.start_time.date() == delivery_date
    )
    if not relevant:
        raise DataQualityError(
            f"No eligible forecast for decision date {decision_date.isoformat()}"
        )

    latest_publication = max(record.publish_time for record in relevant)
    selected = tuple(
        sorted(
            (
                record
                for record in relevant
                if record.publish_time == latest_publication
            ),
            key=lambda record: record.start_time,
        )
    )
    _validate_exact_starts(
        (record.start_time for record in selected),
        _expected_starts(delivery_date, 60),
        "Forecast",
    )
    return latest_publication, selected


def aggregate_actuals_hourly(
    actuals: Sequence[ActualRecord],
    delivery_date: date,
) -> tuple[tuple[datetime, float], ...]:
    """Average equal half-hour outturn periods into hourly MW values."""

    relevant = tuple(
        sorted(
            (record for record in actuals if record.settlement_date == delivery_date),
            key=lambda record: record.start_time,
        )
    )
    _validate_exact_starts(
        (record.start_time for record in relevant),
        _expected_starts(delivery_date, 30),
        "Actual",
    )

    grouped: dict[datetime, list[float]] = defaultdict(list)
    for record in relevant:
        hour = record.start_time.replace(minute=0, second=0, microsecond=0)
        grouped[hour].append(record.generation)

    hourly: list[tuple[datetime, float]] = []
    for hour in _expected_starts(delivery_date, 60):
        values = grouped[hour]
        if len(values) != 2:
            raise DataQualityError(
                f"Expected two half-hour actuals for {hour.isoformat()}"
            )
        hourly.append((hour, fsum(values) / 2))
    return tuple(hourly)


def calculate_metrics(errors: Sequence[float]) -> AccuracyMetrics:
    if not errors:
        raise DataQualityError("At least one error is required")

    count = len(errors)
    mae = fsum(abs(error) for error in errors) / count
    bias = fsum(errors) / count
    rmse = sqrt(fsum(error * error for error in errors) / count)
    return AccuracyMetrics(
        sample_count=count,
        mae_mw=round(mae, 2),
        bias_mw=round(bias, 2),
        rmse_mw=round(rmse, 2),
    )


def build_day_analysis(
    decision_date: date,
    forecasts: Sequence[ForecastRecord],
    actuals: Sequence[ActualRecord],
) -> DayAnalysis:
    delivery_date = decision_date + timedelta(days=1)
    publication, selected_forecasts = select_latest_forecast(forecasts, decision_date)
    hourly_actuals = dict(aggregate_actuals_hourly(actuals, delivery_date))

    hourly = tuple(
        HourlyComparison(
            start_time=forecast.start_time,
            forecast_mw=forecast.generation,
            actual_mw=hourly_actuals[forecast.start_time],
            error_mw=round(
                forecast.generation - hourly_actuals[forecast.start_time], 2
            ),
            absolute_error_mw=round(
                abs(forecast.generation - hourly_actuals[forecast.start_time]),
                2,
            ),
        )
        for forecast in selected_forecasts
    )
    relevant_actuals = tuple(
        sorted(
            (record for record in actuals if record.settlement_date == delivery_date),
            key=lambda record: record.start_time,
        )
    )
    return DayAnalysis(
        decision_date=decision_date,
        delivery_date=delivery_date,
        decision_cutoff=_utc_at(decision_date, DECISION_CUTOFF),
        forecast_published_at=publication,
        metrics=calculate_metrics(tuple(point.error_mw for point in hourly)),
        hourly=hourly,
        half_hourly_actuals=tuple(
            HalfHourlyActual(
                start_time=record.start_time,
                generation_mw=record.generation,
            )
            for record in relevant_actuals
        ),
    )


def build_snapshot(
    days: Sequence[DayAnalysis],
    generated_at: datetime,
) -> AnalysisSnapshot:
    ordered_days = tuple(sorted(days, key=lambda item: item.decision_date))
    if not ordered_days:
        raise DataQualityError("At least one analysed day is required")
    if len({day.decision_date for day in ordered_days}) != len(ordered_days):
        raise DataQualityError("Decision dates must be unique")

    all_errors = tuple(point.error_mw for day in ordered_days for point in day.hourly)
    summaries = tuple(
        DailySummary(
            decision_date=day.decision_date,
            delivery_date=day.delivery_date,
            forecast_published_at=day.forecast_published_at,
            metrics=day.metrics,
        )
        for day in ordered_days
    )
    return AnalysisSnapshot(
        generated_at=generated_at,
        timezone="GMT",
        decision_cutoff_local="15:30",
        sources=DataSources(
            forecasts=FORECAST_SOURCE,
            actuals=ACTUAL_SOURCE,
        ),
        assumptions=ASSUMPTIONS,
        overview=PeriodSummary(
            decision_date_from=ordered_days[0].decision_date,
            decision_date_to=ordered_days[-1].decision_date,
            delivery_date_from=ordered_days[0].delivery_date,
            delivery_date_to=ordered_days[-1].delivery_date,
            metrics=calculate_metrics(all_errors),
            best_day=min(summaries, key=lambda item: item.metrics.mae_mw),
            worst_day=max(summaries, key=lambda item: item.metrics.mae_mw),
            days=summaries,
        ),
        days=ordered_days,
    )
