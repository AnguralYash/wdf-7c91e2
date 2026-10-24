# Wind decision API

The API imports historical Elexon wind data, applies the documented day-ahead
forecast selection rule, calculates accuracy metrics, and serves validated
dashboard responses.

## Data pipeline

From this directory:

```bash
uv sync --dev
uv run refresh-elexon-data
```

The refresh command:

1. fetches every forecast publication made on each January decision date;
2. fetches the following delivery day's half-hour wind outturn;
3. selects the latest complete forecast published strictly before 15:30 GMT;
4. averages each pair of actual values to an hourly value;
5. validates coverage and writes `data/snapshot.json` atomically.

The committed snapshot contains 31 decision days, 744 hourly comparisons, and
1,488 raw half-hour actual values. Keeping this small historical snapshot makes
the deployed pilot reliable while retaining a reproducible route back to the
official Elexon sources.

## Quality checks

```bash
uv run pytest
uv run ruff check .
uv run mypy src
```

