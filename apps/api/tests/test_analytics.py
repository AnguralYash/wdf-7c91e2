from datetime import UTC, date, datetime, timedelta

import pytest

from wind_decision.analytics import (
    DataQualityError,
    aggregate_actuals_hourly,
    build_day_analysis,
    build_snapshot,
    calculate_metrics,
    select_latest_forecast,
)
from wind_decision.models import ActualRecord, ForecastRecord

DECISION_DATE = date(2026, 1, 10)
DELIVERY_DATE = date(2026, 1, 11)


def forecast_batch(
    publish_hour: int,
    publish_minute: int,
    generation: float = 1_000,
) -> tuple[ForecastRecord, ...]:
    publication = datetime(
        2026,
        1,
        10,
        publish_hour,
        publish_minute,
        tzinfo=UTC,
    )
    delivery_start = datetime(2026, 1, 11, tzinfo=UTC)
    return tuple(
        ForecastRecord.model_validate(
            {
                "dataset": "WINDFOR",
                "publishTime": publication,
                "startTime": delivery_start + timedelta(hours=hour),
                "generation": generation + hour,
            }
        )
        for hour in range(24)
    )


def actual_day(
    first_half_hour: float = 900,
    second_half_hour: float = 1_100,
) -> tuple[ActualRecord, ...]:
    delivery_start = datetime(2026, 1, 11, tzinfo=UTC)
    return tuple(
        ActualRecord.model_validate(
            {
                "dataset": "FUELHH",
                "publishTime": delivery_start + timedelta(minutes=30 * (period + 1)),
                "startTime": delivery_start + timedelta(minutes=30 * period),
                "settlementDate": DELIVERY_DATE,
                "settlementPeriod": period + 1,
                "fuelType": "WIND",
                "generation": (
                    first_half_hour if period % 2 == 0 else second_half_hour
                ),
            }
        )
        for period in range(48)
    )


def test_selects_latest_complete_forecast_strictly_before_cutoff() -> None:
    forecasts = (
        *forecast_batch(11, 30, generation=900),
        *forecast_batch(12, 25, generation=950),
        *forecast_batch(15, 30, generation=1_500),
    )

    publication, selected = select_latest_forecast(forecasts, DECISION_DATE)

    assert publication == datetime(2026, 1, 10, 12, 25, tzinfo=UTC)
    assert selected[0].generation == 950
    assert len(selected) == 24


def test_rejects_incomplete_selected_forecast() -> None:
    incomplete = forecast_batch(11, 30)[:-1]

    with pytest.raises(DataQualityError, match="Forecast timestamps"):
        select_latest_forecast(incomplete, DECISION_DATE)


def test_averages_two_half_hour_actuals_into_each_hour() -> None:
    hourly = aggregate_actuals_hourly(
        actual_day(first_half_hour=900, second_half_hour=1_100),
        DELIVERY_DATE,
    )

    assert len(hourly) == 24
    assert hourly[0] == (
        datetime(2026, 1, 11, tzinfo=UTC),
        1_000,
    )


def test_rejects_missing_half_hour_actual() -> None:
    incomplete = actual_day()[:-1]

    with pytest.raises(DataQualityError, match="Actual timestamps"):
        aggregate_actuals_hourly(incomplete, DELIVERY_DATE)


def test_calculates_mae_bias_and_rmse() -> None:
    metrics = calculate_metrics((100, -100, 200, -200))

    assert metrics.sample_count == 4
    assert metrics.mae_mw == 150
    assert metrics.bias_mw == 0
    assert metrics.rmse_mw == 158.11


def test_builds_day_with_positive_error_for_over_forecast_wind() -> None:
    analysis = build_day_analysis(
        DECISION_DATE,
        forecast_batch(11, 30, generation=1_100),
        actual_day(first_half_hour=900, second_half_hour=1_100),
    )

    assert analysis.decision_date == DECISION_DATE
    assert analysis.delivery_date == DELIVERY_DATE
    assert analysis.metrics.bias_mw == 111.5
    assert len(analysis.half_hourly_actuals) == 48


def test_builds_period_metrics_and_best_worst_days() -> None:
    first_day = build_day_analysis(
        DECISION_DATE,
        forecast_batch(11, 30, generation=1_000),
        actual_day(),
    )
    next_decision = DECISION_DATE + timedelta(days=1)
    shifted_forecasts = tuple(
        record.model_copy(
            update={
                "publish_time": record.publish_time + timedelta(days=1),
                "start_time": record.start_time + timedelta(days=1),
                "generation": record.generation + 500,
            }
        )
        for record in forecast_batch(11, 30)
    )
    shifted_actuals = tuple(
        record.model_copy(
            update={
                "publish_time": record.publish_time + timedelta(days=1),
                "start_time": record.start_time + timedelta(days=1),
                "settlement_date": record.settlement_date + timedelta(days=1),
            }
        )
        for record in actual_day()
    )
    second_day = build_day_analysis(
        next_decision,
        shifted_forecasts,
        shifted_actuals,
    )

    snapshot = build_snapshot(
        (second_day, first_day),
        generated_at=datetime(2026, 2, 2, tzinfo=UTC),
    )

    assert snapshot.overview.metrics.sample_count == 48
    assert snapshot.overview.best_day.decision_date == DECISION_DATE
    assert snapshot.overview.worst_day.decision_date == next_decision
    assert snapshot.days[0].decision_date == DECISION_DATE
