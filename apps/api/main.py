"""Vercel ASGI entrypoint for the FastAPI service."""

from wind_decision.api import app

__all__ = ["app"]
