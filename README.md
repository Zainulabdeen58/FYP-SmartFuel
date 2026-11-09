# Smart Fuel Optimization and Resource Management System

Prototype for the Spring 2026 CS619 requirements: track fuel, plan trips with fuel estimates, manage budgets, use crisis-mode suggestions, and view reports — for individuals and small organizations in Pakistan.

## Stack

| Layer | Technology |
|--------|------------|
| Frontend | React 19, Vite, React Router, Axios, Recharts, Leaflet |
| Backend | Node.js, Express 5, Mongoose 8 |
| Database | MongoDB |
| Auth | JWT + bcrypt |
| Routes / places | OpenRouteService (optional; key stays on the server) |

Shared validation and display helpers live in `shared/` (used by both API and UI).

## Features (SRS)

- **Accounts** — Register (Individual / Organizational), login, profile update, logout. Admins cannot self-register.
- **Vehicles** — Add vehicles with fuel efficiency and tank capacity; view, update, delete.
- **Fuel records** — CRUD fuel purchases (date, quantity, cost, odometer) linked to a vehicle.
- **Trips** — Create trips with start and destination; estimated fuel and cost; optimized route options on a map (zoom, pan, select route).
- **Crisis mode** — Suggestions to combine nearby trips, postpone non-essential travel, or switch to a lower-fuel route.
- **Budgets** — Monthly fuel budgets, spending from fuel records, dashboard alerts at 80% / 100%.
- **Reports** — Charts for consumption and cost over time, per-vehicle stats, filters (period, vehicle, fuel type; admin: user).
- **Notifications** — In-app bell for budget limits, inefficient trips (≥15% longer than recommended), and crisis suggestions.
- **Admin** — Manage users and view/edit/delete vehicles across the system; view trips and fuel records (no personal fleet workflow).

Full HTTP API: see [`API.md`](API.md). Roadmap and edge cases: `docs/project-roadmap.html`.

## Roles

| Capability | Individual | Organizational | Admin |
|------------|------------|----------------|-------|
| Register | Yes | Yes (organization name required) | No — seed or promote only |
| Login / profile / logout | Yes | Yes | Yes |
| Add vehicles | Own | Own fleet | No |
| View / edit / delete vehicles | Own | Own | All users’ |
| Fuel records add / edit / delete | Own | Own | No — view only |
| Trips create / edit / delete | Own | Own | No — view only |
| Crisis mode | Yes | Yes | No |
| Monthly budgets + alerts | Yes | Fleet + per vehicle | No |
| Notifications | Yes | Yes | No |
| Reports | Own data | Fleet data | All users |
| Manage users | No | No | Yes |

**Design:** Individual and Organizational accounts are fuel users. Admin is a system manager (users, vehicle oversight, read-only monitoring of trips and fuel).

## Setup

1. **Node.js** 20.6+ (for `--env-file`).
2. **MongoDB** — local or Atlas. Set `MONGODB_URI` in `backend/.env`.
3. Copy env file:

```bash
cp backend/.env.example backend/.env
```

Required in `backend/.env`:

- `MONGODB_URI`
- `JWT_SECRET` (at least 32 characters; not the example placeholder)

Optional:

- `ORS_API_KEY` — free key from [openrouteservice.org](https://openrouteservice.org/). Without it, trips still save but routes and place search are unavailable.
- `CLIENT_URL` — CORS origins (default includes `http://localhost:5173` and preview).
- `ADMIN_*` — used only by the admin seeder (see below).

## Run

From the **project root**:

```bash
npm run install:all   # first time only
npm run dev
```

- API: `http://localhost:5000` (health: `GET /api/health`)
- UI: `http://localhost:5173` (calls `http://localhost:5000/api`)

Or separately:

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (another terminal)
cd frontend && npm install && npm run dev
```

Other root scripts: `npm run build` (frontend), `npm run seed:admin`.

### Create an admin

Registration never creates Admin. After filling `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_CONTACT`, and `ADMIN_PASSWORD` in `backend/.env`:

```bash
npm run seed:admin
```

Safe to re-run: an existing admin is left unchanged. An admin can also change a user’s role on the Administration page.

### Offline route testing (optional)

Fake OpenRouteService (no real key / no internet):

```bash
cd backend
node dev/fakeOrs.js
```

Then start the API with:

```bash
ORS_BASE_URL=http://localhost:5199 ORS_API_KEY=test-key npm run dev
```

## Project layout

```
smart-fuel-optimization/
  backend/     Express API
  frontend/    React (Vite) UI
  shared/      Constants, validation, format helpers
  docs/        SRS, roadmap, architecture notes
  API.md       REST endpoint reference
```
