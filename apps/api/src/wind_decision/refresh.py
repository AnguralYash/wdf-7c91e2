import argparse
import asyncio
import logging
from datetime import UTC, date, datetime, timedelta
from pathlib import Path

import httpx

from wind_decision.analytics import build_day_analysis, build_snapshot
from wind_decision.elexon import BASE_URL, ElexonClient
from wind_decision.models import AnalysisSnapshot, DayAnalysis

LOGGER = logging.getLogger(__name__)
DECISION_DATE_FROM = date(2026, 1, 1)
DECISION_DATE_TO = date(2026, 1, 31)
DEFAULT_OUTPUT = Path(__file__).resolve().parents[2] / "data" / "snapshot.json"


def decision_dates(
    start: date = DECISION_DATE_FROM,
    end: date = DECISION_DATE_TO,
) -> tuple[date, ...]:
    if end < start:
        raise ValueError("End date must not be before start date")
    return tuple(
        start + timedelta(days=offset) for offset in range((end - start).days + 1)
    )


async def analyse_day(
    client: ElexonClient,
    decision_date: date,
) -> DayAnalysis:
    delivery_date = decision_date + timedelta(days=1)
    forecasts, actuals = await asyncio.gather(
        client.fetch_forecasts(decision_date),
        client.fetch_actuals(delivery_date),
    )
    analysis = build_day_analysis(decision_date, forecasts, actuals)
    LOGGER.info(
        "Analysed decision=%s delivery=%s forecast=%s",
        decision_date,
        delivery_date,
        analysis.forecast_published_at.isoformat(),
    )
    return analysis


async def create_snapshot(client: ElexonClient) -> AnalysisSnapshot:
    days = await asyncio.gather(
        *(analyse_day(client, value) for value in decision_dates())
    )
    return build_snapshot(days, generated_at=datetime.now(UTC))


def write_snapshot(snapshot: AnalysisSnapshot, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_suffix(f"{output.suffix}.tmp")
    temporary.write_text(snapshot.model_dump_json(indent=2) + "\n")
    temporary.replace(output)


async def refresh(output: Path) -> AnalysisSnapshot:
    timeout = httpx.Timeout(30, connect=10)
    headers = {"User-Agent": "wind-decision-dashboard/0.1"}
    async with httpx.AsyncClient(
        base_url=BASE_URL,
        timeout=timeout,
        headers=headers,
    ) as http_client:
        snapshot = await create_snapshot(ElexonClient(http_client))
    write_snapshot(snapshot, output)
    return snapshot


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Refresh the January 2026 Elexon analysis snapshot."
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help=f"Snapshot output path (default: {DEFAULT_OUTPUT})",
    )
    return parser.parse_args()


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(levelname)s %(name)s %(message)s",
    )
    args = parse_args()
    snapshot = asyncio.run(refresh(args.output))
    LOGGER.info(
        "Wrote %s days and %s hourly comparisons to %s",
        len(snapshot.days),
        snapshot.overview.metrics.sample_count,
        args.output,
    )


if __name__ == "__main__":
    main()
