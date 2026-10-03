# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Smart Fuel Optimization and Resource Management System: a MERN prototype built for the Spring 2026 CS619 final-project requirements. Users register as **Individual**, **Organizational** or **Admin** (the three account types in the SRS), manage vehicles, and admins manage all users and vehicles. There is no fuel-optimization logic yet; the current scope is auth, profile, vehicle CRUD and admin management. `docs/project-roadmap.html` maps all 13 SRS requirements, their edge cases and the planned coding phases.

The assignment explicitly requires the registration form to include the role field, so self-registering as Admin is intended. Don't remove it without asking.

## Commands

There are two independent npm projects with no root `package.json`, so run commands inside `backend/` or `frontend/`.

```bash
# Backend: Express API on http://localhost:5000 (Node >= 20.6 for --env-file)
cd backend
npm install
npm run dev      # nodemon --env-file=.env server.js
npm start        # node --env-file=.env server.js

# Frontend: Vite dev server on http://localhost:5173
cd frontend
npm install
npm run dev
npm run build    # outputs to frontend/dist (which is committed to git)
npm run preview
```

- `backend/.env` is required (copy from `backend/.env.example`). It needs `MONGODB_URI` and `JWT_SECRET`. The server exits on startup if `MONGODB_URI` is missing. `JWT_SECRET` is not validated at startup; a missing value only fails when a token is signed or verified.
- `PORT` in `.env` is ignored: `server.js` hard-codes `5000`, and `frontend/src/api.js` hard-codes `http://localhost:5000/api`.
- Health check: `GET http://localhost:5000/api/health`.
- There is **no test framework and no linter** configured. The `eslint-disable` comments in the hooks are leftovers. `npm run build` in `frontend/` is the only automated check for frontend changes.
- `frontend/dist/` is tracked in git, because `frontend/.gitignore` is a Visual Studio template that doesn't ignore it. Rebuilding changes the hashed asset filenames, so only commit `dist/` changes deliberately.

## Architecture

Both projects use ES modules (`"type": "module"`) and plain JavaScript (no TypeScript). See `API.md` for the endpoint list.

### Backend (`backend/`): Express 5 + Mongoose 8

- `server.js` awaits `connectDB()` at top level before building the app. `config/db.js` calls `dns.setServers(["8.8.8.8", "1.1.1.1"])` process-wide so `mongodb+srv://` SRV lookups work on some Windows/ISP setups.
- **Responses** use the envelope `{ success: boolean, message?, <resource> }`, for example `{ success, vehicles }` or `{ success, user }`.
- **Errors:** `middleware/errorHandler.js` (registered last in `server.js`) turns every thrown error into `{ success: false, message }` JSON: Mongoose `CastError` → 400 ("Invalid id"), `ValidationError` → 400, duplicate key → 409, malformed JSON body → 400, anything else → logged and a generic 500. Express 5 forwards rejected async handlers there, so controllers don't use `try/catch`; just let errors throw. `server.js` also defaults `req.body` to `{}` (Express 5 leaves it undefined when there is no JSON body).
- **Auth flow:**
  - `utils/token.js` signs `{ userId }` with a 1-day expiry.
  - `middleware/auth.js` `protect` verifies the Bearer token and **re-loads the user from MongoDB on every request** into `req.user` (password excluded), so role changes take effect immediately.
  - `adminOnly` checks `req.user.role === "Admin"`.
  - Logout is a server-side no-op; the client just discards the token.
- **Authorization lives in controllers, not routes:**
  - `/api/vehicles` is shared by all roles. Controllers branch on `req.user.role`: Admins see and edit every vehicle; Individual and Organizational users only see and edit their own (`isOwnerOrAdmin` in `vehicleController.js`).
  - `/api/admin/*` applies `router.use(protect, adminOnly)`.
  - The admin UI edits and deletes vehicles through the regular `/api/vehicles/:id` endpoints; only listing/search uses `/api/admin/vehicles?user=&registrationNumber=`. Both search params are case-insensitive `$regex` matches on regex-escaped text (`escapeRegex`); non-string query values are ignored. `user` matches the owner's name or email.
- **Input validation** runs in the controllers via `utils/validation.js` (rules mirror `frontend/src/validation.js`; each check returns `""` or a message, combined with `firstError`), plus schema validators: vehicle `fuelEfficiency`/`fuelTankCapacity` must be > 0 and `modelYear` 1980 to next year. Registration numbers are unique across all users through an application-level check (`registrationTaken`, 409), not a unique index.
- **Organizational accounts** need `organizationName` (schema `required` function on `User`). When an admin moves a user to another role, `adminController.updateUser` clears it.
- **Passwords** are hashed with `bcrypt.hash(pw, 12)` inside the controllers (`authController.register`, `userController.updateProfile`). There is no pre-save hook and no schema length rule (the field holds the hash), so any new code path that sets a password must call `checkPassword` and hash it. Changing a password through `PUT /users/profile` requires `currentPassword`; a wrong one returns **400, not 401**, because the frontend treats every 401 as an expired session and signs the user out.
- **User object shape:**
  - Login, register and profile-update return `user.toPublic()`: `{ id, fullName, email, contactNumber, role, organizationName }`.
  - `GET /users/profile` and the admin endpoints return Mongoose documents with `_id`.
  - The frontend handles both (`currentUser?.id || currentUser?._id`).
- Deleting a user (`adminController.deleteUser`) manually cascades with `Vehicle.deleteMany({ user })`. Admins cannot delete themselves or remove their own Admin role, and this is enforced on both server and client.

### Frontend (`frontend/src/`): React 19 + Vite 7 + React Router 7 + Axios

- **Auth state:** there is no global store or context.
  - `hooks/useAuth.js` is called once in `App.jsx`. It persists `token` and `user` in `localStorage`, and `api.js` attaches the token via a request interceptor.
  - `api.js` also has a response interceptor: any 401 (except from `/auth/login` and `/auth/register`) calls the handler `useAuth` registers with `setUnauthorizedHandler`, which clears storage and `user`, so the app falls back to `/login`. Don't return 401 for ordinary user mistakes.
  - `App.jsx` renders one of two route trees depending on whether `user` is set: the logged-in tree inside `Layout`, or the login/register pages. It also guards `/admin` by role.
  - `components/Protected.jsx` is unused.
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
- **Form validation** is in `validation.js`. Each validator returns `""` or an error message. The backend repeats the same rules (`backend/utils/validation.js`), so change both together.
- Edit modals (`VehicleForm`, `UserForm`) render through `createPortal(…, document.body)`. Pages show them by setting an "editing" state to a record.
- Styling is one global stylesheet, `global.css`, imported in `App.jsx`. It uses plain class names, with light/dark themes switched by `[data-theme]`. Icons are inline SVGs looked up by name in `components/Icon.jsx`; add new icons there.

### Values duplicated across backend and frontend (keep in sync)

- **Roles `"Individual"` / `"Organizational"` / `"Admin"`:**
  - The list lives in `ROLES` in `backend/models/User.js` and `ROLES` (plus display names in `ROLE_LABELS`) in `frontend/src/constant.js`.
  - `"Admin"` and `"Organizational"` are still checked as string literals in `middleware/auth.js`, `vehicleController`, `adminController`, `authController`, `userController`, `App.jsx`, `Layout`, `Dashboard`, `AuthPage`, `UserForm` and `Profile`.
- **Fuel types `"Petrol"`, `"Diesel"`, `"Electric"`:**
  - Backend: `models/Vehicle.js`.
  - Frontend: `FUEL_TYPES` in `constant.js` (also used by `validateFuelType`).
- **Validation rules** (email, phone, password length, organization name, vehicle numbers): `backend/utils/validation.js` plus the schema validators, and `frontend/src/validation.js`.
- **Adding a vehicle field** requires touching all of these:
  1. `models/Vehicle.js`.
  2. The `fields` whitelist in `controllers/vehicleController.js`. Fields not listed are silently dropped on create and update.
  3. `EMPTY_VEHICLE`, `VEHICLE_LABELS` and (if numeric) `NUMBER_FIELDS` in `frontend/src/constant.js`.
  4. `toFormValues`, `validate` and the numeric coercion in `onSubmit` in `components/VehicleForm.jsx`. The form renders fields by iterating `Object.entries(form)`, so field order follows `EMPTY_VEHICLE`.
  5. The display in `components/Vehicles.jsx` and `components/Admin.jsx`.

## Git

The working branch is `main`. The default branch on `origin` is `master`.
