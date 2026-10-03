# REST API

Base URL: `/api`

Every response is JSON. Errors look like `{ "success": false, "message": "..." }`
with status 400 (invalid input or id), 401 (missing/expired token), 403 (not allowed),
404 (not found) or 409 (email or registration number already in use).

## Authentication
- `POST /auth/register` — `fullName`, `email`, `contactNumber`, `role` (`Individual`, `Organizational` or `Admin`), `password` (min 6). `organizationName` is required when `role` is `Organizational`.
- `POST /auth/login` — `email`, `password`
- `POST /auth/logout` (Bearer token)

## Profile
- `GET /users/profile`
- `PUT /users/profile` — any of `fullName`, `email`, `contactNumber`, `organizationName` (organizational accounts). To change the password send `password` and `currentPassword`.

## Vehicles
- `POST /vehicles` — `fuelEfficiency` and `fuelTankCapacity` must be greater than 0, `modelYear` between 1980 and next year, `registrationNumber` unique.
- `GET /vehicles`
- `GET /vehicles/:id`
- `PUT /vehicles/:id`
- `DELETE /vehicles/:id`

## Admin
All require Admin role.
- `GET /admin/users`
- `GET /admin/users/:id`
- `PUT /admin/users/:id`
- `DELETE /admin/users/:id`
- `GET /admin/vehicles?user=&registrationNumber=`
