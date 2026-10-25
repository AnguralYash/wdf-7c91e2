# Wind Decision

A decision-support pilot for evaluating the Great Britain wind-generation
forecasts available before day-ahead electricity purchasing decisions in
January 2026.

The dashboard helps a buyer understand the latest eligible forecast for each
decision day, compare it with delivered wind generation, and quantify the size
and direction of forecast errors.

## Live application

https://wdf-7c91e2.vercel.app

## What the product shows

- The latest complete Elexon `WINDFOR` publication available before the assumed
  15:30 GMT decision cutoff.
- The following delivery day's Elexon `FUELHH` wind outturn.
- Half-hour actual generation alongside the hourly forecast.
- Mean absolute error (typical miss), bias (forecast direction), and RMSE
  (large-error indicator).
- Daily detail and January-wide forecast performance.

The product supports purchasing decisions but does not prescribe an exact
purchase quantity. Consumer demand, existing contracts, other generation,
reserves, and prices were not supplied.

## Repository structure

```text
.
├── apps/
│   ├── api/
│   │   ├── data/                 Versioned January 2026 snapshot
│   │   ├── src/wind_decision/    Ingestion, analytics, models and FastAPI
│   │   └── tests/                Backend unit and API tests
│   └── web/
│       ├── src/components/       Dashboard components and charts
│       ├── src/hooks/            React Query data hooks
│       └── src/                  API client, types and formatting utilities
├── docs/decisions.md             Product and engineering decisions
├── .github/workflows/ci.yml      Backend, frontend and container CI
├── docker-compose.yml            Local full-stack environment
└── vercel.json                   Public deployment configuration
```

## Run with Docker

Docker is the simplest way to start the complete application:

```bash
docker compose up --build
```

Open:

- Dashboard: http://localhost:8080
- API documentation: http://localhost:8080/api/docs
- Health check: http://localhost:8080/api/health

Stop the application with:

```bash
docker compose down
```

## Run for development

Prerequisites:

- Python 3.12 or newer
- [uv](https://docs.astral.sh/uv/)
- Node.js 22

Start the API:

```bash
cd apps/api
uv sync --dev
uv run uvicorn wind_decision.api:app --reload --port 8000
```

In another terminal, start the frontend:

```bash
cd apps/web
npm ci
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` requests to the FastAPI service.

## Refresh the Elexon snapshot

The committed snapshot keeps the historical pilot reliable and reproducible.
To rebuild it from Elexon:

```bash
cd apps/api
uv run refresh-elexon-data
```

The refresh pipeline fetches forecast publications and actual generation,
selects the latest eligible complete forecast, validates temporal coverage, and
atomically replaces `apps/api/data/snapshot.json`.

## Methodology

1. Treat 1-31 January 2026 as decision dates.
2. Treat the following calendar day as the delivery day.
3. Assume the EPEX half-hour day-ahead auction closes at 15:30 GMT.
4. Select the latest complete forecast published strictly before the cutoff.
5. Average each pair of half-hour actuals for comparison with the hourly
   forecast.
6. Calculate error as `forecast - actual`.

A positive error means wind was over-forecast, creating a risk of purchasing
too little replacement electricity. A negative error means wind was
under-forecast, creating a risk of purchasing more than necessary.

See [docs/decisions.md](docs/decisions.md) for the complete assumptions and
design rationale.

## Quality checks

Backend:

```bash
cd apps/api
uv run ruff check .
uv run mypy src
uv run pytest
```

Frontend:

```bash
cd apps/web
npm run lint
npm test
npm run build
```

CI runs these checks and builds both Docker images for every pull request to
`main`.

## API

- `GET /api/health`
- `GET /api/v1/overview`
- `GET /api/v1/metadata`
- `GET /api/v1/days/{decision_date}`
- `GET /api/docs`

Responses are validated by strict Pydantic models. The immutable snapshot is
loaded and validated once at process startup.

## Technology

- React, TypeScript, Vite, TanStack Query and Recharts
- Python, FastAPI, Pydantic and HTTPX
- Docker Compose and Nginx
- GitHub Actions
- Vercel

## AI-tool disclosure

Cursor AI was used to assist with requirements analysis, domain research,
implementation, refactoring, testing, and documentation. All changes and
analytical assumptions were reviewed, tested, and validated by the developer.

