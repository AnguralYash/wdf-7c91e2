import asyncio
from datetime import date

import httpx
import pytest

from wind_decision.elexon import ElexonClient, ElexonResponseError
from wind_decision.refresh import decision_dates


def forecast_payload() -> list[dict[str, object]]:
    return [
        {
            "dataset": "WINDFOR",
            "publishTime": "2026-01-10T11:30:00Z",
            "startTime": "2026-01-11T00:00:00Z",
            "generation": 1_000,
        }
    ]


def actual_payload() -> list[dict[str, object]]:
    return [
        {
            "dataset": "FUELHH",
            "publishTime": "2026-01-11T00:30:00Z",
            "startTime": "2026-01-11T00:00:00Z",
            "settlementDate": "2026-01-11",
            "settlementPeriod": 1,
            "fuelType": "WIND",
            "generation": 900,
        }
    ]


def test_fetches_forecasts_with_publish_time_filters() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path.endswith("/datasets/WINDFOR/stream")
        assert request.url.params["publishDateTimeFrom"] == ("2026-01-10T00:00:00Z")
        assert request.url.params["publishDateTimeTo"] == ("2026-01-10T23:59:59Z")
        return httpx.Response(200, json=forecast_payload())

    async def run() -> None:
        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(
            transport=transport,
            base_url="https://example.test",
        ) as http_client:
            records = await ElexonClient(http_client).fetch_forecasts(date(2026, 1, 10))
        assert records[0].generation == 1_000

    asyncio.run(run())


def test_fetches_only_wind_actuals_for_delivery_date() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path.endswith("/datasets/FUELHH/stream")
        assert request.url.params["settlementDateFrom"] == "2026-01-11"
        assert request.url.params["settlementDateTo"] == "2026-01-11"
        assert request.url.params["fuelType"] == "WIND"
        return httpx.Response(200, json=actual_payload())

    async def run() -> None:
        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(
            transport=transport,
            base_url="https://example.test",
        ) as http_client:
            records = await ElexonClient(http_client).fetch_actuals(date(2026, 1, 11))
        assert records[0].fuel_type == "WIND"

    asyncio.run(run())


def test_retries_transient_response_before_succeeding() -> None:
    attempts = 0
    delays: list[float] = []

    def handler(_: httpx.Request) -> httpx.Response:
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            return httpx.Response(429)
        return httpx.Response(200, json=forecast_payload())

    async def no_wait(delay: float) -> None:
        delays.append(delay)

    async def run() -> None:
        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(
            transport=transport,
            base_url="https://example.test",
        ) as http_client:
            records = await ElexonClient(
                http_client,
                sleep=no_wait,
            ).fetch_forecasts(date(2026, 1, 10))
        assert len(records) == 1

    asyncio.run(run())

    assert attempts == 2
    assert delays == [0.5]


def test_wraps_invalid_elexon_payload_with_context() -> None:
    def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=[{"unexpected": "shape"}])

    async def run() -> None:
        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(
            transport=transport,
            base_url="https://example.test",
        ) as http_client:
            with pytest.raises(
                ElexonResponseError,
                match="Invalid WINDFOR response for 2026-01-10",
            ):
                await ElexonClient(http_client).fetch_forecasts(date(2026, 1, 10))

    asyncio.run(run())


def test_produces_all_january_decision_dates() -> None:
    values = decision_dates()

    assert len(values) == 31
    assert values[0] == date(2026, 1, 1)
    assert values[-1] == date(2026, 1, 31)
