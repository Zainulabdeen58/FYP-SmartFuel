# REST API

Base URL: `/api`

Every response is JSON. Errors look like `{ "success": false, "message": "..." }`
with status 400 (invalid input or id), 401 (missing/expired token), 403 (not allowed),
404 (not found), 409 (email or registration number already in use) or 429 (too many attempts).

## Authentication
- `POST /auth/register` — `fullName`, `email`, `contactNumber`, `role` (`Individual` or `Organizational`; `Admin` is rejected), `password` (8-64 characters, letters and numbers). Limited to 10 registrations per IP per hour. `organizationName` is required when `role` is `Organizational`.
- `POST /auth/login` — `email`, `password`. After 10 failed attempts from one IP in 15 minutes it returns 429.
- `POST /auth/logout` (Bearer token)

## Profile
- `GET /users/profile` — the same user shape as login (`id`, `fullName`, `email`, `contactNumber`, `role`, `organizationName`)
- `PUT /users/profile` — any of `fullName`, `email`, `contactNumber`, `organizationName` (organizational accounts). To change the password send `password` and `currentPassword`.

## Vehicles
- `POST /vehicles` — `fuelEfficiency` and `fuelTankCapacity` must be greater than 0, `modelYear` between 1980 and next year, `registrationNumber` unique.
- `GET /vehicles`
- `GET /vehicles/:id`
- `PUT /vehicles/:id`
- `DELETE /vehicles/:id`

Deleting a vehicle also deletes its fuel records.

## Fuel records
- `POST /fuel-records` — `vehicle` (id), `date` (`YYYY-MM-DD`, not in the future, Pakistan time), `quantity` (litres, > 0 and not more than the vehicle's tank), `totalCost` (Rs, > 0), optional `odometer` (km) and `station`. Price per litre is calculated by the server and must come out between Rs 100 and Rs 1,000. Electric vehicles are rejected.
- `GET /fuel-records?vehicle=&from=&to=` — all filters optional; dates are `YYYY-MM-DD` and inclusive. Newest first.
- `GET /fuel-records/:id`
- `PUT /fuel-records/:id` — any of the fields above; send `""` for `odometer` or `station` to clear it.
- `DELETE /fuel-records/:id`

Users see only records for their own vehicles; admins see all.

## Admin
All require Admin role.
- `GET /admin/users`
- `GET /admin/users/:id`
- `PUT /admin/users/:id`
- `DELETE /admin/users/:id`
- `GET /admin/vehicles?user=&registrationNumber=`
