# GTrade Angular

Angular frontend for [GTrade-Go](https://github.com/BulatXXX/GTrade-Go).

## Branching

- `main` — release branch
- `develop` — main development branch
- feature branches use `feature/{feature_name}`
- fixes use `bugfix/{bugfix_name}`

## Features

- Login and registration through `api-gateway` → `auth-service`
- Password reset request and confirmation
- Catalog item search with game filter (`all`, `tarkov`, `warframe`, `eve`)
- Item card with description, market price snapshot, top price and analytics widgets
- Watchlist toggle on item cards
- Profile/watchlist management page with PvP/PvE mode switch for Tarkov pricing
- Dark glass UI inspired by the provided TarkovHelper reference

## Backend contract

Default API base URL is configured in `src/app/core/api/api.config.ts`:

```ts
export const API_BASE_URL = '';
```

The frontend uses gateway paths:

- `/api/auth/login`
- `/api/auth/register`
- `/api/auth/password/reset/request`
- `/api/auth/password/reset/confirm`
- `/api/items`, `/api/items/search`, `/api/items/{id}`
- `/api/market/items/{external_id}/prices`
- `/api/market/items/{external_id}/top-price`

## Development

```bash
nvm use
npm install
npm start
```

Open <http://localhost:4200>.

Use Node.js 22 LTS. Node 23 is not supported for this project and can fail during Angular build/start.
In development, Angular proxies `/api` to `http://localhost:8080` and user-asset-service routes (`/watchlist`, `/users`, `/preferences`, `/recent`, `/health`) to `http://localhost:8082`, so backend CORS is not required for local frontend runs.

## Build

```bash
npm run build
```
