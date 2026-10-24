import asyncio

import httpx

from wind_decision.api import app


def get(path: str) -> httpx.Response:
    async def request() -> httpx.Response:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://testserver",
        ) as client:
            return await client.get(path)

    return asyncio.run(request())


def test_health_reports_loaded_snapshot() -> None:
    response = get("/api/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["decision_days"] == 31
    assert float(response.headers["X-Process-Time-Ms"]) >= 0


def test_overview_returns_month_metrics_and_cache_header() -> None:
    response = get("/api/v1/overview")

    assert response.status_code == 200
    assert response.headers["Cache-Control"] == "public, max-age=300"
    assert response.json()["decision_date_from"] == "2026-01-01"
    assert response.json()["decision_date_to"] == "2026-01-31"
    assert response.json()["metrics"]["sample_count"] == 744
    assert len(response.json()["days"]) == 31


def test_metadata_explains_sources_assumptions_and_coverage() -> None:
    response = get("/api/v1/metadata")

    assert response.status_code == 200
    payload = response.json()
    assert payload["timezone"] == "GMT"
    assert payload["decision_cutoff_local"] == "15:30"
    assert payload["coverage"] == {
        "decision_days": 31,
        "hourly_comparisons": 744,
        "half_hour_actuals": 1_488,
    }
    assert "WINDFOR" in payload["sources"]["forecasts"]
    assert len(payload["assumptions"]) >= 4


def test_day_detail_returns_hourly_and_half_hour_data() -> None:
    response = get("/api/v1/days/2026-01-15")

    assert response.status_code == 200
    payload = response.json()
    assert payload["decision_date"] == "2026-01-15"
    assert payload["delivery_date"] == "2026-01-16"
    assert payload["forecast_published_at"] == "2026-01-15T12:25:00Z"
    assert len(payload["hourly"]) == 24
    assert len(payload["half_hourly_actuals"]) == 48


def test_day_detail_rejects_date_outside_analysis_period() -> None:
    response = get("/api/v1/days/2026-02-01")

    assert response.status_code == 404
    assert "2026-01-01 to 2026-01-31" in response.json()["detail"]


def test_day_detail_rejects_invalid_date_format() -> None:
    response = get("/api/v1/days/not-a-date")

    assert response.status_code == 422


def test_openapi_contract_exposes_versioned_analysis_routes() -> None:
    response = get("/api/openapi.json")

    assert response.status_code == 200
    paths = response.json()["paths"]
    assert "/api/v1/overview" in paths
    assert "/api/v1/metadata" in paths
    assert "/api/v1/days/{decision_date}" in paths
