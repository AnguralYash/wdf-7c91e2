from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class DomainModel(BaseModel):
    """Shared strict, immutable configuration for domain and API models."""

    model_config = ConfigDict(extra="forbid", frozen=True)


class ForecastRecord(DomainModel):
    dataset: Literal["WINDFOR"]
    publish_time: datetime = Field(alias="publishTime")
    start_time: datetime = Field(alias="startTime")
    generation: float = Field(ge=0)


class ActualRecord(DomainModel):
    dataset: Literal["FUELHH"]
    publish_time: datetime = Field(alias="publishTime")
    start_time: datetime = Field(alias="startTime")
    settlement_date: date = Field(alias="settlementDate")
    settlement_period: int = Field(alias="settlementPeriod", ge=1, le=50)
    fuel_type: Literal["WIND"] = Field(alias="fuelType")
    generation: float = Field(ge=0)


class AccuracyMetrics(DomainModel):
    sample_count: int = Field(ge=1)
    mae_mw: float = Field(ge=0)
    bias_mw: float
    rmse_mw: float = Field(ge=0)


class HourlyComparison(DomainModel):
    start_time: datetime
    forecast_mw: float = Field(ge=0)
    actual_mw: float = Field(ge=0)
    error_mw: float
    absolute_error_mw: float = Field(ge=0)


class HalfHourlyActual(DomainModel):
    start_time: datetime
    generation_mw: float = Field(ge=0)


class DayAnalysis(DomainModel):
    decision_date: date
    delivery_date: date
    decision_cutoff: datetime
    forecast_published_at: datetime
    metrics: AccuracyMetrics
    hourly: tuple[HourlyComparison, ...]
    half_hourly_actuals: tuple[HalfHourlyActual, ...]


class DailySummary(DomainModel):
    decision_date: date
    delivery_date: date
    forecast_published_at: datetime
    metrics: AccuracyMetrics


class PeriodSummary(DomainModel):
    decision_date_from: date
    decision_date_to: date
    delivery_date_from: date
    delivery_date_to: date
    metrics: AccuracyMetrics
    best_day: DailySummary
    worst_day: DailySummary
    days: tuple[DailySummary, ...]


class DataSources(DomainModel):
    forecasts: str
    actuals: str


class AnalysisSnapshot(DomainModel):
    generated_at: datetime
    timezone: Literal["GMT"]
    decision_cutoff_local: Literal["15:30"]
    sources: DataSources
    assumptions: tuple[str, ...]
    overview: PeriodSummary
    days: tuple[DayAnalysis, ...]


class DataCoverage(DomainModel):
    decision_days: int = Field(ge=1)
    hourly_comparisons: int = Field(ge=1)
    half_hour_actuals: int = Field(ge=1)


class SnapshotMetadata(DomainModel):
    generated_at: datetime
    timezone: Literal["GMT"]
    decision_cutoff_local: Literal["15:30"]
    sources: DataSources
    assumptions: tuple[str, ...]
    coverage: DataCoverage


class HealthResponse(DomainModel):
    status: Literal["ok"]
    snapshot_generated_at: datetime
    decision_days: int = Field(ge=1)
