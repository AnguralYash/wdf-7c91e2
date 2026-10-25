import logging
import os
from collections.abc import Sequence
from datetime import date
from pathlib import Path
from time import perf_counter

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import RequestResponseEndpoint

from wind_decision.models import (
    DayAnalysis,
    HealthResponse,
    PeriodSummary,
    SnapshotMetadata,
)
from wind_decision.repository import DEFAULT_SNAPSHOT_PATH, SnapshotRepository

LOGGER = logging.getLogger(__name__)
CACHE_CONTROL = "public, max-age=300"


def _allowed_origins() -> Sequence[str]:
    configured = os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:5173")
    return tuple(value.strip() for value in configured.split(",") if value.strip())


def create_app(
    snapshot_path: Path = DEFAULT_SNAPSHOT_PATH,
) -> FastAPI:
    repository = SnapshotRepository.from_path(snapshot_path)
    app = FastAPI(
        title="Wind Decision API",
        summary="Historical GB wind forecast decision-support data.",
        version="1.0.0",
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_allowed_origins(),
        allow_credentials=False,
        allow_methods=["GET"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def observe_request(
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        started = perf_counter()
        response = await call_next(request)
        duration_ms = (perf_counter() - started) * 1_000
        response.headers["X-Process-Time-Ms"] = f"{duration_ms:.2f}"
        LOGGER.info(
            "request method=%s path=%s status=%s duration_ms=%.2f",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
        )
        return response

    @app.get(
        "/api/health",
        response_model=HealthResponse,
        tags=["service"],
    )
    async def health() -> HealthResponse:
        return HealthResponse(
            status="ok",
            snapshot_generated_at=repository.snapshot.generated_at,
            decision_days=len(repository.snapshot.days),
        )

    @app.get(
        "/api/v1/overview",
        response_model=PeriodSummary,
        tags=["analysis"],
    )
    async def overview(response: Response) -> PeriodSummary:
        response.headers["Cache-Control"] = CACHE_CONTROL
        return repository.snapshot.overview

    @app.get(
        "/api/v1/metadata",
        response_model=SnapshotMetadata,
        tags=["analysis"],
    )
    async def metadata(response: Response) -> SnapshotMetadata:
        response.headers["Cache-Control"] = CACHE_CONTROL
        return repository.metadata()

    @app.get(
        "/api/v1/days/{decision_date}",
        response_model=DayAnalysis,
        tags=["analysis"],
    )
    async def day_detail(
        decision_date: date,
        response: Response,
    ) -> DayAnalysis:
        day = repository.day(decision_date)
        if day is None:
            start = repository.snapshot.overview.decision_date_from
            end = repository.snapshot.overview.decision_date_to
            raise HTTPException(
                status_code=404,
                detail=(
                    f"No analysis for {decision_date.isoformat()}; "
                    f"choose a decision date from {start} to {end}."
                ),
            )
        response.headers["Cache-Control"] = CACHE_CONTROL
        return day

    return app


app = create_app()
