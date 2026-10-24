from datetime import date
from pathlib import Path

from wind_decision.models import (
    AnalysisSnapshot,
    DataCoverage,
    DayAnalysis,
    SnapshotMetadata,
)

DEFAULT_SNAPSHOT_PATH = Path(__file__).resolve().parents[2] / "data" / "snapshot.json"


class SnapshotRepository:
    """Validated, in-memory view of the immutable analysis snapshot."""

    def __init__(self, snapshot: AnalysisSnapshot) -> None:
        self.snapshot = snapshot
        self._days = {day.decision_date: day for day in snapshot.days}

    @classmethod
    def from_path(cls, path: Path = DEFAULT_SNAPSHOT_PATH) -> "SnapshotRepository":
        snapshot = AnalysisSnapshot.model_validate_json(path.read_text())
        return cls(snapshot)

    def day(self, decision_date: date) -> DayAnalysis | None:
        return self._days.get(decision_date)

    def metadata(self) -> SnapshotMetadata:
        half_hour_actuals = sum(
            len(day.half_hourly_actuals) for day in self.snapshot.days
        )
        return SnapshotMetadata(
            generated_at=self.snapshot.generated_at,
            timezone=self.snapshot.timezone,
            decision_cutoff_local=self.snapshot.decision_cutoff_local,
            sources=self.snapshot.sources,
            assumptions=self.snapshot.assumptions,
            coverage=DataCoverage(
                decision_days=len(self.snapshot.days),
                hourly_comparisons=self.snapshot.overview.metrics.sample_count,
                half_hour_actuals=half_hour_actuals,
            ),
        )
