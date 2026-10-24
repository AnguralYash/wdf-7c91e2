from datetime import date
from pathlib import Path

from wind_decision.models import AnalysisSnapshot

SNAPSHOT_PATH = Path(__file__).parents[1] / "data" / "snapshot.json"


def test_committed_snapshot_is_complete_and_valid() -> None:
    snapshot = AnalysisSnapshot.model_validate_json(SNAPSHOT_PATH.read_text())

    assert len(snapshot.days) == 31
    assert snapshot.overview.metrics.sample_count == 744
    assert snapshot.overview.decision_date_from == date(2026, 1, 1)
    assert snapshot.overview.decision_date_to == date(2026, 1, 31)
    assert snapshot.overview.delivery_date_from == date(2026, 1, 2)
    assert snapshot.overview.delivery_date_to == date(2026, 2, 1)
    assert all(len(day.hourly) == 24 for day in snapshot.days)
    assert all(len(day.half_hourly_actuals) == 48 for day in snapshot.days)
    assert all(day.forecast_published_at < day.decision_cutoff for day in snapshot.days)
