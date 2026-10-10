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
- `POST /vehicles` — `vehicleName` and `manufacturer` 2 to 50 characters (manufacturer starts with a letter); `registrationNumber` 3 to 15 characters, letters and numbers (both required) joined by single spaces or hyphens, unique; `fuelEfficiency` 1 to 100 km/l; `fuelTankCapacity` 1 to 1000 litres; `modelYear` between 1980 and next year. `PUT /vehicles/:id` applies the same rules to the fields it receives.
- `GET /vehicles`
- `GET /vehicles/:id`
- `PUT /vehicles/:id`
- `DELETE /vehicles/:id`

Deleting a vehicle also deletes its fuel records and budgets.

## Fuel records
- `POST /fuel-records` — `vehicle` (id), `date` (`YYYY-MM-DD`, not in the future, Pakistan time), `quantity` (litres, > 0 and not more than the vehicle's tank), `totalCost` (Rs, > 0), optional `odometer` (km) and `station`. Price per litre is calculated by the server and must come out between Rs 100 and Rs 1,000. Electric vehicles are rejected.
- `GET /fuel-records?vehicle=&from=&to=` — all filters optional; dates are `YYYY-MM-DD` and inclusive. Newest first.
- `GET /fuel-records/:id`
- `PUT /fuel-records/:id` — any of the fields above; send `""` for `odometer` or `station` to clear it.
- `DELETE /fuel-records/:id`

Users see only records for their own vehicles; admins see all.

## Monthly budgets
Individual and Organizational accounts only; admins get 403. Months are `YYYY-MM` in Pakistan time. Spending is the total cost of the user's fuel records dated in that month, added up on every request (nothing is stored).
- `GET /budgets?month=YYYY-MM` (default: this month) returns `summary`:
  - `month`, and `editable` (true for this month and up to 12 months ahead; past months are view-only).
  - `overall`: `{ spent, budget }` for the month's overall budget (the fleet budget for an organization).
  - `vehicles`: one `{ vehicle, spent, budget }` per petrol or diesel vehicle (Organizational only, otherwise `[]`).
  - `budget` is `null` when none is set, else `{ _id, amount, remaining, percentUsed, status }`. `status` is `ok`, `warning` (80% or more) or `over` (100% or more); `remaining` is negative when over.
- `PUT /budgets` with `month`, `amount` (Rs, > 0, at most Rs 1 crore) and optional `vehicle` (id) creates or replaces that budget. Rules:
  - Only this month and up to 12 months ahead.
  - A vehicle budget needs an Organizational account, the user's own petrol or diesel vehicle, and the month's fleet budget set first.
  - The vehicle budgets of a month may not add up to more than the fleet budget, and the fleet budget may not be lowered below them (400 with the totals in the message).
- `DELETE /budgets/:id` removes a budget of this month or later. The fleet budget can only be removed after that month's vehicle budgets.

## Admin
All require Admin role.
- `GET /admin/users`
- `GET /admin/users/:id`
- `PUT /admin/users/:id` (changing the role also removes budgets the new role cannot have: all of them for Admin, the vehicle budgets for Individual)
- `DELETE /admin/users/:id` (also deletes the user's vehicles, fuel records and budgets)
- `GET /admin/vehicles?user=&registrationNumber=`
