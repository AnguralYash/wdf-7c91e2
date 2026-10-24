# Product and engineering decisions

This file records decisions that materially affect the pilot and why they were
made.

## Product scope

- **Decision dates are 1–31 January 2026.** The brief scopes purchase decisions,
  not delivery dates. Each decision is evaluated against the following delivery
  day, producing a delivery range of 2 January–1 February 2026.
- **The pilot assumes the EPEX half-hour day-ahead auction.** Its order book
  closes at 15:30 GMT on the day before delivery. The brief does not name an
  exchange or cutoff, so this is an explicit assumption.
- **Only forecasts published strictly before 15:30 GMT are eligible.** A
  publication stamped at the closure time cannot safely be assumed to have been
  available while orders were still editable.
- **The latest eligible publication is selected dynamically.** Historical
  publication times vary, so no fixed forecast publication time is hard-coded.
- **The application supports a purchase decision; it does not prescribe one.**
  Demand, existing contracts, other generation, reserves, and prices are not in
  scope, so an exact additional purchase quantity cannot be calculated.

## Analysis

- **Forecast accuracy is evaluated hourly.** `WINDFOR` has one value per hour,
  while `FUELHH` has two equal half-hour periods. The two actual values are
  averaged to form a comparable hourly actual.
- **Raw half-hour actuals are retained.** They reveal within-hour movement in the
  detailed view without changing the hourly accuracy calculation.
- **Error is forecast minus actual.** Positive bias means wind was
  over-forecast, creating a risk of under-procuring replacement power. Negative
  bias means wind was under-forecast.
- **MAE and bias are the primary metrics.** MAE communicates the typical miss;
  bias communicates its direction. RMSE is secondary and highlights large
  misses.

## Architecture

- **React with Vite and FastAPI live in one monorepo.** The separation makes the
  required frontend and backend skills explicit while preserving one product
  history.
- **A repeatable ingestion command creates a versioned snapshot.** The fixed
  historical dashboard remains fast and reliable, while the source data can be
  refreshed if Elexon publishes corrections.
- **The FastAPI service owns the public contract.** The browser receives
  validated summary and daily-detail responses rather than implementing energy
  analysis itself.
- **Docker supports local execution.** Vercel is the target public host.

