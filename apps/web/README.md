# Wind Decision web application

The React frontend presents the January 2026 wind forecast analysis exposed by
the FastAPI service.

## Development

Start the API on port 8000, then run:

```bash
npm ci
npm run dev
```

Vite serves the application at http://localhost:5173 and proxies `/api` to the
local backend.

## Commands

```bash
npm run lint
npm test
npm run build
npm run preview
```

The production Docker image builds the Vite application and serves it with
Nginx. Nginx also proxies `/api` to the backend container.
