# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Smart Fuel Optimization and Resource Management System: a MERN prototype built for the Spring 2026 CS619 final-project requirements. Users register as **Individual**, **Organizational** or **Admin** (the three account types in the SRS), manage vehicles, and admins manage all users and vehicles. There is no fuel-optimization logic yet; the current scope is auth, profile, vehicle CRUD, fuel purchase records (FR-04) and admin management. `docs/project-roadmap.html` maps all 13 SRS requirements, their edge cases and the planned coding phases.

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

- `backend/.env` is required (copy from `backend/.env.example`). It needs `MONGODB_URI` and `JWT_SECRET`. The server exits on startup if `MONGODB_URI` is missing, or if `JWT_SECRET` is missing, shorter than 32 characters or still the `.env.example` placeholder (`config/env.js`, called first in `server.js`).
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
  - `adminOnly` checks `req.user.role === "Admin"`.
  - Logout is a server-side no-op; the client just discards the token.
- **Authorization lives in controllers, not routes:**
  - `/api/vehicles` and `/api/fuel-records` are shared by all roles. Controllers branch on `req.user.role`: Admins see and edit every record; Individual and Organizational users only see and edit their own (`isOwnerOrAdmin` in `utils/access.js`).
  - `/api/admin/*` applies `router.use(protect, adminOnly)`.
  - The admin UI edits and deletes vehicles through the regular `/api/vehicles/:id` endpoints; only listing/search uses `/api/admin/vehicles?user=&registrationNumber=`. Both search params are case-insensitive `$regex` matches on regex-escaped text (`escapeRegex`); non-string query values are ignored. `user` matches the owner's name or email.
- **Input validation** runs in the controllers via `utils/validation.js`, which re-exports the rules in `shared/validation.js` (the same ones the forms use; each check returns `""` or a message, combined with `firstError`). Vehicle create/update checks every field (`vehicleError`; on update only the fields sent). Schema validators stay as a last guard: vehicle `fuelEfficiency`/`fuelTankCapacity` > 0, `modelYear` 1980 to next year. Registration numbers are unique across all users: `registrationTaken` gives a clear 409, and a unique index on `registrationNumber` blocks simultaneous duplicates (mapped to 409 in `errorHandler`). Non-text registration numbers get a 400.
- **Fuel records** (`models/FuelRecord.js`, `controllers/fuelRecordController.js`):
  - `date` is a calendar day sent as `"YYYY-MM-DD"` and stored as **UTC midnight of that day** (`parseFuelDate`), so the UTC date of a stored value is the day the user picked; "today" and "future" are judged in Pakistan time (`todayInPakistan`, `Asia/Karachi`). Format stored dates with `timeZone: "UTC"` and group months by UTC month, never by the server's or browser's local time.
  - `user` is the **vehicle's owner** (also when an admin adds the record), and moves with the record if it is moved to another vehicle.
  - `pricePerLitre` is computed in a `pre("validate")` hook from `totalCost / quantity`; never accept it from the request. It must be Rs 100 to 1,000 (`MIN/MAX_PRICE_PER_LITRE`), to catch typing mistakes.
  - Electric vehicles can't have fuel records, and quantity can't exceed the tank. On update these two vehicle rules run only when the vehicle or quantity changes, so old records stay editable after the vehicle is edited.
  - Deleting a vehicle deletes its fuel records; deleting a user deletes their vehicles and fuel records.
- **Organizational accounts** need `organizationName` (schema `required` function on `User`). When an admin moves a user to another role, `adminController.updateUser` clears it.
- **Login and register are rate limited** (`middleware/rateLimit.js`, express-rate-limit): 10 failed logins per IP per 15 minutes (successful ones don't count) and 10 registrations per IP per hour, answered with 429. `NODE_ENV=test` turns the limits off for automated API tests.
- **Password rule** for new passwords (register, profile change, admin seeder): 8 to 64 characters with letters and numbers (`checkPassword` in `shared/validation.js`). Login only requires a non-empty password, so accounts made under the old 6-character rule can still sign in.
- **Passwords** are hashed with `bcrypt.hash(pw, 12)` inside the controllers (`authController.register`, `userController.updateProfile`). There is no pre-save hook and no schema length rule (the field holds the hash), so any new code path that sets a password must call `checkPassword` and hash it. Changing a password through `PUT /users/profile` requires `currentPassword`; a wrong one returns **400, not 401**, because the frontend treats every 401 as an expired session and signs the user out.
- **User object shape:**
  - Login, register and profile-update return `user.toPublic()`: `{ id, fullName, email, contactNumber, role, organizationName }`.
  - `GET /users/profile` also returns `toPublic()`; `useAuth` calls it when the app opens and on window focus (`refreshUser`) so a role or detail change made by an admin shows up without signing in again.
  - The admin endpoints return Mongoose documents with `_id`.
  - The frontend handles both (`currentUser?.id || currentUser?._id`).
- Deleting a user (`adminController.deleteUser`) manually cascades to their fuel records and vehicles. Admins cannot delete themselves or remove their own Admin role, and this is enforced on both server and client.

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
  - `useFetch(fetcher, deps, { immediate, initialData })` returns `{ data, setData, error, setError, loading, reload }`.
  - `useAdmin(currentUser)` holds all admin-page state:
    - The user search filters client-side.
    - The vehicle search is server-side with a 250 ms debounce.
  - `useTheme` sets `data-theme` on `<html>` and stores it in `localStorage` as `theme`. An inline script in `index.html` applies the saved theme before first paint.
- **Form validation:** `validation.js` re-exports the shared `check*` rules and adds frontend-only helpers (`checkCurrentPassword`, `hasErrors`). Each check returns `""` or an error message. `constant.js` likewise re-exports the shared constants next to UI-only ones (labels, nav links, empty forms).
- Edit modals (`VehicleForm`, `UserForm`) render through `createPortal(…, document.body)`. Pages show them by setting an "editing" state to a record.
- Styling is one global stylesheet, `global.css`, imported in `App.jsx`. It uses plain class names, with light/dark themes switched by `[data-theme]`. Icons are inline SVGs looked up by name in `components/Icon.jsx`; add new icons there.

### Shared code (`shared/`): used by both backend and frontend

- `shared/constants.js` (`ROLES`, `REGISTER_ROLES`, `FUEL_TYPES`, password/model-year limits, `VEHICLE_LIMITS`, price-per-litre range, station length) and `shared/validation.js` (every `check*` rule, `firstError`, `parseFuelDate`, `todayInPakistan`). Change a rule or value here only.
- Import them with plain relative paths (`import { ROLES } from "../../shared/constants.js"`); no alias or build setup is needed. The backend imports them directly (models, `authController`) or through `utils/validation.js`; the frontend only through `src/constant.js` and `src/validation.js`, so components keep importing from those two files. Inside `shared/` itself, files import each other as `./constants.js`.
- `frontend/vite.config.js` lists `../shared` in `server.fs.allow`, because the Vite dev server only serves files inside `frontend/` by default.
- Rules for these files: plain JavaScript only (no npm packages, nothing browser- or Node-only), and always write the `.js` extension in imports (Node needs it). `shared/package.json` marks the folder as ES modules for Node.
- Number checks accept both form text (`"15"`) and JSON numbers (`15`); `true`, arrays and objects are refused.
- `"Admin"` and `"Organizational"` are still checked as string literals in `shared/validation.js` (`checkRole`), `middleware/auth.js`, `vehicleController`, `adminController`, `authController`, `userController`, `App.jsx`, `Layout`, `Dashboard`, `AuthPage`, `UserForm` and `Profile`. Role display names are `ROLE_LABELS` in `frontend/src/constant.js`.
- **Adding a vehicle field** requires touching all of these:
  1. `models/Vehicle.js`.
  2. The `fields` whitelist and `vehicleError` in `controllers/vehicleController.js`. Fields not listed are silently dropped on create and update. Put its check in `shared/validation.js`.
  3. `EMPTY_VEHICLE`, `VEHICLE_LABELS` and (if numeric) `NUMBER_FIELDS` in `frontend/src/constant.js`.
  4. `toFormValues`, `validate` and the numeric coercion in `onSubmit` in `components/VehicleForm.jsx`. The form renders fields by iterating `Object.entries(form)`, so field order follows `EMPTY_VEHICLE`.
  5. The display in `components/Vehicles.jsx` and `components/Admin.jsx`.

## Git

The working branch is `main`. The default branch on `origin` is `master`.
