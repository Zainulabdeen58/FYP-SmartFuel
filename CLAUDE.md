# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Smart Fuel Optimization and Resource Management System: a MERN prototype built for the Spring 2026 CS619 final-project requirements. Users register as **Individual**, **Organizational** or **Admin** (the three account types in the SRS), manage vehicles, and admins manage all users and vehicles. There is no fuel-optimization logic yet; the current scope is auth, profile, vehicle CRUD, fuel purchase records (FR-04), monthly budgets with alerts (FR-08), reports with charts and filters (FR-09, FR-10), trips with fuel estimates and routes on a map (FR-05, FR-06, FR-11, FR-12) and admin management. `docs/project-roadmap.html` maps all 13 SRS requirements, their edge cases and the planned coding phases.

Registration offers only **Individual** and **Organizational** (`REGISTER_ROLES`); the server rejects `role: "Admin"` at `/auth/register`. Admins are created by the seeder `seeders/adminSeeder.js` (`npm run seed:admin`, reads `ADMIN_NAME`/`ADMIN_EMAIL`/`ADMIN_CONTACT`/`ADMIN_PASSWORD` from `.env`; idempotent, never resets an existing admin's password, refuses an email that belongs to a non-admin), or by an existing admin on the Administration page.

## Commands

`backend/` and `frontend/` are two independent npm projects. The root `package.json` only runs them together (`concurrently`): `npm run dev` in the root starts both, with output prefixed `[api]` and `[web]`; `npm run install:all` installs root, backend and frontend; `npm run build` and `npm run seed:admin` forward to the frontend and backend. Both also import from the root `shared/` folder (see "Shared code" below), so deploy the whole repo, not one folder alone.

```bash
# From the project root: both servers in one terminal
npm run install:all   # first time only
npm run dev

# Backend: Express API on http://localhost:5000 (Node >= 20.6 for --env-file)
cd backend
npm install
npm run dev      # nodemon --env-file=.env server.js
npm start        # node --env-file=.env server.js
npm run seed:admin   # create the admin from ADMIN_* in .env

# Frontend: Vite dev server on http://localhost:5173
cd frontend
npm install
npm run dev
npm run build    # outputs to frontend/dist (which is committed to git)
npm run preview
```

- `backend/.env` is required (copy from `backend/.env.example`). It needs `MONGODB_URI` and `JWT_SECRET`. `ORS_API_KEY` (free OpenRouteService key) is optional: without it the server starts with a warning, trips save without routes and place search answers 503. For tests and offline demos run the fake route service, `node dev/fakeOrs.js` in `backend/` (port 5199), and start the API with `ORS_BASE_URL=http://localhost:5199 ORS_API_KEY=test-key`; with `NODE_ENV=test` and no `ORS_BASE_URL` no route-service call is ever made. The server exits on startup if `MONGODB_URI` is missing, or if `JWT_SECRET` is missing, shorter than 32 characters or still the `.env.example` placeholder (`config/env.js`, called first in `server.js`).
- `server.js` listens on `PORT` from `.env` (default 5000), but `frontend/src/api.js` hard-codes `http://localhost:5000/api`, so change both together. CORS only allows the origins in `CLIENT_URL` (comma-separated; default `http://localhost:5173,http://localhost:4173`, the dev and preview servers); `helmet` adds security headers.
- Health check: `GET http://localhost:5000/api/health`.
- There is **no test framework and no linter** configured. `npm run build` in `frontend/` is the only automated check for frontend changes.
- `frontend/dist/` is tracked in git, because `frontend/.gitignore` is a Visual Studio template that doesn't ignore it. Rebuilding changes the hashed asset filenames, so only commit `dist/` changes deliberately.

## Architecture

Both projects use ES modules (`"type": "module"`) and plain JavaScript (no TypeScript). See `API.md` for the endpoint list.

### Backend (`backend/`): Express 5 + Mongoose 8

- `server.js` awaits `connectDB()` at top level before building the app. `config/db.js` calls `dns.setServers(["8.8.8.8", "1.1.1.1"])` process-wide so `mongodb+srv://` SRV lookups work on some Windows/ISP setups.
- **Responses** use the envelope `{ success: boolean, message?, <resource> }`, for example `{ success, vehicles }` or `{ success, user }`.
- **Errors:** `middleware/errorHandler.js` (registered last in `server.js`) turns every thrown error into `{ success: false, message }` JSON: Mongoose `CastError` → 400 ("Invalid id"), `ValidationError` → 400, duplicate key → 409, malformed JSON body → 400, anything else → logged and a generic 500. Express 5 forwards rejected async handlers there, so controllers don't use `try/catch`; just let errors throw. `server.js` also defaults `req.body` to `{}` (Express 5 leaves it undefined when there is no JSON body).
- **Auth flow:**
  - `utils/token.js` signs `{ userId }` with a 1-day expiry.
  - `middleware/auth.js` `protect` verifies the Bearer token and **re-loads the user from MongoDB on every request** into `req.user` (password excluded), so role changes take effect immediately. Only token errors return 401; a database error goes to the error handler (500), so users are not signed out during a database problem.
  - `adminOnly` checks `req.user.role === "Admin"`; `nonAdminOnly` is its opposite (used by `/api/budgets`).
  - Logout is a server-side no-op; the client just discards the token.
- **Authorization lives in controllers, not routes:**
  - `/api/vehicles` and `/api/fuel-records` are shared by all roles. Controllers branch on `req.user.role`: Admins see and edit every record; Individual and Organizational users only see and edit their own (`isOwnerOrAdmin` and, for lists, `ownerFilter` in `utils/access.js`).
  - `/api/admin/*` applies `router.use(protect, adminOnly)`.
  - `/api/budgets` applies `router.use(protect, nonAdminOnly)`: admins have no budgets and don't see other users' budgets, so every budget query is limited to `req.user`.
  - `/api/trips`: everyone reads their own trips (admins all of them); changes go through `viewOnlyForAdmins` in `routes/tripRoutes.js` (admins may only look, a roadmap proposal still to be confirmed with the supervisor). `/api/places` is for any signed-in user.
  - The admin UI edits and deletes vehicles through the regular `/api/vehicles/:id` endpoints; only listing/search uses `/api/admin/vehicles?user=&registrationNumber=`. Both search params are case-insensitive `$regex` matches on regex-escaped text; `registrationNumber` uses `registrationNumberPattern` (`utils/validation.js`), which ignores spaces and hyphens. Non-string query values are ignored. `user` matches the owner's name or email.
- **Input validation** runs in the controllers via `utils/validation.js`, which re-exports the rules in `shared/validation.js` (the same ones the forms use; each check returns `""` or a message, combined with `firstError`). Vehicle create/update first runs `vehicleTypeError` on the vehicle as it will be saved: a `vehicleType` and (unless electric) an `engineCC` are required, and engine, fuel efficiency and tank must fit the type's range (`checkVehicleTypeFields`, `VEHICLE_TYPE_LIMITS`; electric vehicles skip only the engine). The form uses the same function, so both report the type's range first (a car's tank: 25 to 80 litres, not the general 1 to 1000). Then `vehicleError` checks every field (on update only the fields sent). Vehicles saved before these two fields existed have neither (the schema doesn't require them, the list shows "Type missing"), so their next edit must add them; fuel entries and reports work without them. A fuel efficiency unusual for the engine size (`USUAL_MILEAGE_BY_ENGINE`, `getMileageWarning`) is only a warning in the form, never a rejection. Schema validators stay as a last guard: vehicle `fuelEfficiency`/`fuelTankCapacity` > 0, `modelYear` 1980 to next year. Registration numbers (`checkRegistrationNumber`) start with letters and are written in at most `MAX_REGISTRATION_PARTS` parts of at most `MAX_REGISTRATION_PART_LENGTH` letters or numbers (LEA-1234, LEB-07-1234, ICT-AB-123). After validation `normalizeVehicleText` saves them in one spelling (`normalizeRegistrationNumber`: `lea 1234` → `LEA-1234`) and saves common makes in their usual spelling (`normalizeManufacturer`, `COMMON_MANUFACTURERS`: `HONDA` → `Honda`). Registration numbers are unique across all users: `registrationTaken` gives a clear 409 and ignores spaces and hyphens (`registrationNumberPattern`), because vehicles saved before this rule keep the spacing they were typed with; a unique index on `registrationNumber` blocks simultaneous duplicates (mapped to 409 in `errorHandler`). Non-text registration numbers get a 400. Number text must be a plain number (`"12.5"`); `toNumber` in `shared/validation.js` refuses text like `"1e3"` or `"0x10"` that JavaScript would also read as a number.
- **Fuel records** (`models/FuelRecord.js`, `controllers/fuelRecordController.js`):
  - `date` is a calendar day sent as `"YYYY-MM-DD"` and stored as **UTC midnight of that day** (`parseFuelDate`), so the UTC date of a stored value is the day the user picked; "today" and "future" are judged in Pakistan time (`todayInPakistan`, `Asia/Karachi`). Format stored dates with `timeZone: "UTC"` and group months by UTC month, never by the server's or browser's local time.
  - `user` is the **vehicle's owner** (also when an admin adds the record), and moves with the record if it is moved to another vehicle.
  - `pricePerLitre` is computed in a `pre("validate")` hook from `totalCost / quantity`; never accept it from the request. It must be Rs 100 to 1,000 (`MIN/MAX_PRICE_PER_LITRE`), to catch typing mistakes.
  - Electric vehicles can't have fuel records, and quantity can't exceed the tank. On update these two vehicle rules run only when the vehicle or quantity changes, so old records stay editable after the vehicle is edited.
  - **Odometer:** a reading is required unless the request sends `odometerNotWorking: true` (the form's "My odometer is not working" box); then the reading is cleared. That flag is not stored: an entry without a reading *is* a "not working" entry, which also covers entries saved before readings were required. `checkOdometerOrder` keeps readings from going backwards per vehicle (at least the highest earlier-dated reading, at most the lowest later-dated one; same-day entries are not compared). On update it runs only when the reading, date or vehicle changes.
  - Deleting a vehicle deletes its fuel records, budgets and trips; deleting a user deletes their vehicles, fuel records, budgets and trips.
- **Monthly budgets (FR-08)** (`models/Budget.js`, `controllers/budgetController.js`):
  - One document per user, `month` (`"YYYY-MM"`, Pakistan time) and `vehicle`. `vehicle: null` is the month's overall budget (the fleet budget for an Organizational account); a vehicle id is that vehicle's budget (Organizational only, petrol/diesel only). A unique index on `{ user, month, vehicle }` keeps one of each.
  - Budgets are set per month and do not carry over. Only the current month and up to `MAX_BUDGET_MONTHS_AHEAD` (12) months ahead can be set or removed (`checkBudgetMonth`); past months are view-only.
  - A vehicle budget needs the month's fleet budget first; vehicle budgets may not add up to more than the fleet budget, and the fleet budget can't be lowered below them or removed while they exist.
  - **Spending is never stored**: `GET /budgets` (`getMonthlyBudgetSummary`) adds up `totalCost` of the user's fuel records in the month's UTC date range on every request, so editing or deleting a record, or changing a budget, updates the status at once. Status: `ok`, `warning` from `BUDGET_WARNING_PERCENT` (80%), `over` from 100%. Alerts are "live" (shown while the status holds); one-time notifications are planned for FR-13.
  - `PUT /budgets` (`createOrUpdateBudget`) upserts by `{ user, month, vehicle }`, so setting and editing are the same call.
  - When an admin changes a user's role, `adminController.updateUser` deletes the budgets the new role can't have (all for Admin, the vehicle budgets for Individual).
- **Reports (FR-09, FR-10)** (`controllers/reportController.js`, `utils/fuelReport.js`): `GET /reports` reads the filters (`readReportFilters`), loads the matching vehicles and their records in the range (oldest first), and the pure functions in `utils/fuelReport.js` build the totals, the zero-filled periods (`month`, or `year` over `MAX_MONTHLY_REPORT_MONTHS` = 24) and per-vehicle stats. Mileage (`calculateMileage`, full-tank method) is measured gap by gap between consecutive readings (distance ÷ litres bought in that gap, including entries without a reading). A gap above `MAX_MILEAGE_FACTOR` (2) × the vehicle's stated `fuelEfficiency` means fill-ups were not recorded, so it is skipped (`skippedGaps`); a repeated reading (same-day top-up) carries its fuel into the next gap. With no usable gap it falls back to the vehicle's `fuelEfficiency` marked `source: "estimate"`. Non-admins only ever see their own vehicles; admins see all, or one user's with `?user=`.
- **Trips (FR-05, FR-06, FR-11, FR-12)** (`models/Trip.js`, `controllers/tripController.js`, `controllers/placeController.js`):
  - A trip: `user` (the vehicle's owner), `vehicle`, `start` and `destination` (`{ name, lat, lng }`), `date` (calendar day stored as UTC midnight, like fuel records), `purpose`, `priority` (for the later crisis mode), `status` (`planned`/`completed`), the saved estimate basis (`kmPerLitre`, `mileageSource`, `pricePerLitre`, `tankRangeKm`) and `routes` with `recommendedRoute`/`selectedRoute` indexes, or a `routeError`. Estimates are saved with the trip and only change on edit or "Recalculate".
  - `utils/ors.js` is the only code that calls OpenRouteService: place search, reverse lookup and routes. Places are `{ lat, lng }` everywhere else; ORS's `[lng, lat]` order exists only there. It returns results or `{ status, message }` (never 401; a rejected key is logged and answered 503), uses a 10 s timeout and an in-memory cache (`utils/ttlCache.js`: places 7 days, routes 1 hour, failures not cached).
  - ORS `alternative_routes` works only under 100 km, so `findRoutes` asks for variants (fastest, shortest, avoiding motorways) and drops duplicates. Motorcycles and rickshaws are banned from Pakistani motorways, so their variants always avoid them (`avoid_features: ["highways"]`, not tollways, which would also cut GT Road); buses/trucks use `driving-hgv`.
  - `utils/tripEstimate.js` (pure): `buildEstimateBasis` (measured mileage via `calculateMileage` once `MIN_MEASURED_MILEAGE_KM` were measured over `ESTIMATE_HISTORY_MONTHS`, otherwise the stated efficiency; tank range; latest price), `addFuelEstimates` (litres, rupees, refuel warning) and `chooseRecommended` (fewest litres, i.e. shortest, among routes within `MAX_ROUTE_SLOWDOWN` × the fastest time). Electric vehicles get routes but no litres or rupees.
  - Saving never fails because of the route service: `calculateRoutes` stores `routeError` instead. On update a new vehicle or new places get new routes; a new price only re-prices the same routes.
  - `placeLimiter` and `routeLimiter` (`middleware/rateLimit.js`) limit each user, because the free ORS quota (2,000 routes and 1,000 searches a day) is shared by everyone.
- Small backend helpers: `utils/numbers.js` (`roundToTwoDecimals`, used for every rupee and litre total), `utils/dates.js` (`getMonthDateRange`, the UTC range of a `"YYYY-MM"` month) and `queryText` in `utils/validation.js` (a query value as trimmed text, or `""` when it is an array).
- **Organizational accounts** need `organizationName` (schema `required` function on `User`). When an admin moves a user to another role, `adminController.updateUser` clears it.
- **Login and register are rate limited** (`middleware/rateLimit.js`, express-rate-limit): 10 failed logins per IP per 15 minutes (successful ones don't count) and 10 registrations per IP per hour, answered with 429. `NODE_ENV=test` turns the limits off for automated API tests.
- **Password rule** for new passwords (register, profile change, admin seeder): 8 to 64 characters with letters and numbers (`checkPassword` in `shared/validation.js`). Login only requires a non-empty password, so accounts made under the old 6-character rule can still sign in.
- **Passwords** are hashed with `bcrypt.hash(pw, 12)` inside the controllers (`authController.register`, `userController.updateProfile`). There is no pre-save hook and no schema length rule (the field holds the hash), so any new code path that sets a password must call `checkPassword` and hash it. Changing a password through `PUT /users/profile` requires `currentPassword`; a wrong one returns **400, not 401**, because the frontend treats every 401 as an expired session and signs the user out.
- **User object shape:**
  - Login, register and profile-update return `user.toPublic()`: `{ id, fullName, email, contactNumber, role, organizationName }`.
  - `GET /users/profile` also returns `toPublic()`; `useAuth` calls it when the app opens and on window focus (`refreshUser`) so a role or detail change made by an admin shows up without signing in again.
  - The admin endpoints return Mongoose documents with `_id`.
  - The frontend handles both (`currentUser?.id || currentUser?._id`).
- Deleting a user (`adminController.deleteUser`) manually cascades to their fuel records, budgets and vehicles. Admins cannot delete themselves or remove their own Admin role, and this is enforced on both server and client.

### Frontend (`frontend/src/`): React 19 + Vite 7 + React Router 7 + Axios

- **Auth state:** there is no global store or context.
  - `hooks/useAuth.js` is called once in `App.jsx`. It persists `token` and `user` in `localStorage`, and `api.js` attaches the token via a request interceptor.
  - `api.js` also has a response interceptor: any 401 (except from `/auth/login` and `/auth/register`) calls the handler `useAuth` registers with `setUnauthorizedHandler`, which clears storage and `user`, so the app falls back to `/login`. Don't return 401 for ordinary user mistakes.
  - `App.jsx` renders one of two route trees depending on whether `user` is set: the logged-in tree inside `Layout`, or the login/register pages. It also guards `/admin` by role.
- **Profile edits** go through `useAuth().updateUser`, which updates `localStorage` and the shared `user`, so `Layout`, `Dashboard` and `Profile` stay in step. `Profile` is keyed by user id in `App.jsx` so it remounts when a different user signs in.
- **Hooks own the data and form plumbing; components mostly render.**
  - `useForm({ initialValues, validate, onSubmit, errorMessage })`:
    - `validate(form)` returns a `{ field: message }` object, where `""` means valid.
    - `onSubmit(form, { setForm, setFieldErrors, setError })` may throw; the hook shows `err.response.data.message` or the fallback `errorMessage`.
    - `initialValues` are read only on mount.
    - `validateField(name)` (wired to `onBlur`) shows a field's error as soon as the user leaves it; empty fields are skipped, so "is required" errors still wait for submit. When any field changes, errors already shown on other fields are checked again, because some depend on it (a car's tank limit on the vehicle type, the price per litre on the quantity).
  - `useFetch(fetcher, deps, { immediate, initialData })` returns `{ data, setData, error, setError, loading, reload }`.
  - `useVehicles()` fetches `GET /vehicles` (Vehicles, Fuel Records and Reports pages).
  - `useMonthlyBudgetSummary(month, { enabled })` fetches `GET /budgets` for one month. `components/BudgetCard.jsx` (on the Dashboard for non-admins) shows the month picker, overall budget, per-vehicle budgets and `BudgetForm`; `BudgetAlerts` renders the amber/red alerts and is reused at the top of Fuel Records, which reloads it after every record change.
  - Reports page (`components/Reports.jsx`, lazy-loaded in `App.jsx` so the large Recharts library is only downloaded there): `useReportFilters` keeps the filters in the URL query (`from`, `to`, `vehicle`, `fuelType`, `user`) and builds each change from `window.location.search`, so quick successive changes don't undo each other; `useFuelReport(filters)` fetches `GET /reports`. `ReportFilters` (period presets from `REPORT_PERIOD_PRESETS` or a custom month range), `FuelTrendChart` (bars per period) and `VehicleComparison` (bar per vehicle by litres, spending or mileage, plus a table; clicking a bar sets the vehicle filter) render it. Chart colours come from the theme's CSS variables in `components/chartTheme.js`.
  - Trips page (`components/Trips.jsx`, lazy-loaded in `App.jsx` because of Leaflet): `TripForm` (a panel, not a modal; `PlaceField` searches on a button or Enter, never while typing, and the map picks points; the price follows the vehicle's latest entry from `useEstimateBasis` until the user types one), `TripDetails` (`useTrip`; route choice is shown at once and saved in the background), `RouteList` (the route table, also the fallback when map tiles fail) and `TripMap` (react-leaflet 5 with Leaflet 1.9: OpenStreetMap tiles with attribution, `CircleMarker` pins instead of image markers, route lines decoded by `polyline.js`, selected line drawn on top, `fitBounds` without animation, `maxBounds` around Pakistan, wheel zoom only after a click). `.trip-map` uses `isolation: isolate` so Leaflet's z-indexes stay under the sidebar, top bar and modals; dark theme inverts the tiles with a CSS filter. Other hooks: `useTrips`, `usePlaceSearch`.
  - `useFetch` ignores answers from requests that are no longer the newest (`latestRequestNumber`), so a slow earlier request can't overwrite newer data when a month or filter changes quickly.
  - `useAdmin(currentUser)` holds all admin-page state:
    - The user search filters client-side.
    - The vehicle search is server-side with a 250 ms debounce.
  - `useTheme` sets `data-theme` on `<html>` and stores it in `localStorage` as `theme`. An inline script in `index.html` applies the saved theme before first paint.
- **Number boxes** in the forms use `NUMBER_INPUT_PROPS` from `constant.js` (`type="text"` with `inputMode="decimal"`), not `type="number"`, which changes its value on mouse-wheel scroll and reports some typed text (`e`) as empty; the shared checks judge exactly what was typed.
- **Form validation:** `validation.js` re-exports the shared `check*` rules and adds frontend-only helpers (`checkCurrentPassword`, `hasErrors`). Each check returns `""` or an error message. `constant.js` likewise re-exports the shared constants next to UI-only ones (labels, nav links, empty forms).
- Number, unit, month, vehicle and chart-label helpers (`formatNumber`, `formatRupees`, `formatLitres`, `formatKmPerLitre`, `formatMonthLabel`, `formatPeriodLabel`, `formatCompactNumber`, `formatVehicleLabel`, `formatVehicleType`) live in `format.js`.
- Edit modals (`VehicleForm`, `UserForm`, `FuelRecordForm`, `BudgetForm`) render through `createPortal(…, document.body)`. Pages show them by setting an "editing" state to a record.
- Styling is one global stylesheet, `global.css`, imported in `App.jsx`. It uses plain class names, with light/dark themes switched by `[data-theme]`. Icons are inline SVGs looked up by name in `components/Icon.jsx`; add new icons there.

### Shared code (`shared/`): used by both backend and frontend

- `shared/constants.js` (`ROLES`, `REGISTER_ROLES`, `FUEL_TYPES`, password/model-year limits, `VEHICLE_LIMITS`, price-per-litre range, station length, odometer limit, budget and report limits) and `shared/validation.js` (every `check*` rule, `firstError`, `parseFuelDate`, `todayInPakistan`, `currentMonthInPakistan`, `addMonths`, `countMonths`, `firstMonthOfRange`, `listMonths`, `checkReportRange`, `hasOdometerReading`, and the trip checks `checkPlace`, `checkDifferentPlaces`, `checkTripDate`, `checkTripPriority`, `checkTripPurpose`, `checkFuelPrice`, `checkPlaceSearch`, `isInPakistan`, `distanceBetweenKm`). Change a rule or value here only.
- Import them with plain relative paths (`import { ROLES } from "../../shared/constants.js"`); no alias or build setup is needed. The backend imports them directly (models, `authController`) or through `utils/validation.js`; the frontend only through `src/constant.js` and `src/validation.js`, so components keep importing from those two files. Inside `shared/` itself, files import each other as `./constants.js`.
- `frontend/vite.config.js` lists `../shared` in `server.fs.allow`, because the Vite dev server only serves files inside `frontend/` by default.
- Rules for these files: plain JavaScript only (no npm packages, nothing browser- or Node-only), and always write the `.js` extension in imports (Node needs it). `shared/package.json` marks the folder as ES modules for Node.
- Number checks accept both form text (`"15"`) and JSON numbers (`15`); `true`, arrays and objects are refused.
- `"Admin"` and `"Organizational"` are still checked as string literals in `shared/validation.js` (`checkRole`), `middleware/auth.js`, `vehicleController`, `adminController`, `authController`, `userController`, `App.jsx`, `Layout`, `Dashboard`, `AuthPage`, `UserForm` and `Profile`. Role display names are `ROLE_LABELS` in `frontend/src/constant.js`.
- **Adding a vehicle field** requires touching all of these:
  1. `models/Vehicle.js`.
  2. The `fields` whitelist and `vehicleError` (or `vehicleTypeError` for rules that need other fields) in `controllers/vehicleController.js`. Fields not listed are silently dropped on create and update. Put its check in `shared/validation.js`.
  3. `EMPTY_VEHICLE`, `VEHICLE_LABELS` and (if numeric) `NUMBER_FIELDS` in `frontend/src/constant.js`.
  4. `toFormValues`, `validateVehicle` and the numeric coercion in `onSubmit` in `components/VehicleForm.jsx` (and `SELECT_OPTIONS` if it is a dropdown). The form renders fields by iterating `Object.keys(form)` through `renderField`, so field order follows `EMPTY_VEHICLE`.
  5. The display in `components/Vehicles.jsx` and `components/Admin.jsx` (type and engine use `formatVehicleType` in `format.js`).

## Git

The working branch is `main`. The default branch on `origin` is `master`.
