import asyncio
from collections.abc import Awaitable, Callable
from datetime import date, datetime, time, timedelta
from typing import Any

import httpx
from pydantic import TypeAdapter, ValidationError

from wind_decision.models import ActualRecord, ForecastRecord

BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1"
TRANSIENT_STATUS_CODES = frozenset({429, 500, 502, 503, 504})
FORECAST_ADAPTER = TypeAdapter(tuple[ForecastRecord, ...])
ACTUAL_ADAPTER = TypeAdapter(tuple[ActualRecord, ...])
Sleep = Callable[[float], Awaitable[None]]


class ElexonResponseError(RuntimeError):
    """Raised when Elexon returns data that does not match its documented shape."""


class ElexonClient:
    def __init__(
        self,
        http_client: httpx.AsyncClient,
        *,
        max_concurrent_requests: int = 4,
        max_attempts: int = 3,
        sleep: Sleep = asyncio.sleep,
    ) -> None:
        if max_concurrent_requests < 1:
            raise ValueError("max_concurrent_requests must be positive")
        if max_attempts < 1:
            raise ValueError("max_attempts must be positive")
        self._http_client = http_client
        self._semaphore = asyncio.Semaphore(max_concurrent_requests)
        self._max_attempts = max_attempts
        self._sleep = sleep

    async def _get_json(
        self,
        path: str,
        params: dict[str, str],
    ) -> Any:
        for attempt in range(1, self._max_attempts + 1):
            try:
                async with self._semaphore:
                    response = await self._http_client.get(path, params=params)
                if (
                    response.status_code in TRANSIENT_STATUS_CODES
                    and attempt < self._max_attempts
                ):
                    await self._sleep(0.5 * 2 ** (attempt - 1))
                    continue
                response.raise_for_status()
                return response.json()
            except httpx.TransportError:
                if attempt == self._max_attempts:
                    raise
                await self._sleep(0.5 * 2 ** (attempt - 1))

        raise RuntimeError("Unreachable retry state")

    async def fetch_forecasts(
        self,
        decision_date: date,
    ) -> tuple[ForecastRecord, ...]:
        start = datetime.combine(decision_date, time.min)
        end = start + timedelta(days=1) - timedelta(seconds=1)
        payload = await self._get_json(
            "/datasets/WINDFOR/stream",
            {
                "publishDateTimeFrom": f"{start.isoformat()}Z",
                "publishDateTimeTo": f"{end.isoformat()}Z",
            },
        )
        try:
            return FORECAST_ADAPTER.validate_python(payload)
        except ValidationError as error:
            raise ElexonResponseError(
                f"Invalid WINDFOR response for {decision_date.isoformat()}"
            ) from error

    async def fetch_actuals(
        self,
        delivery_date: date,
    ) -> tuple[ActualRecord, ...]:
        value = delivery_date.isoformat()
        payload = await self._get_json(
            "/datasets/FUELHH/stream",
            {
                "settlementDateFrom": value,
                "settlementDateTo": value,
                "fuelType": "WIND",
            },
        )
        try:
            return ACTUAL_ADAPTER.validate_python(payload)
        except ValidationError as error:
            raise ElexonResponseError(
                f"Invalid FUELHH response for {delivery_date.isoformat()}"
            ) from error
