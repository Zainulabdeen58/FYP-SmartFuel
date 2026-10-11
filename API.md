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
- `POST /vehicles` — `vehicleName` and `manufacturer` 2 to 50 characters (manufacturer starts with a letter; a common make typed in another case, e.g. `HONDA`, is saved as `Honda`); `registrationNumber` 3 to 20 characters of letters, numbers, spaces and hyphens, starting with letters and containing numbers, in at most 4 parts of at most 4 letters or numbers (e.g. `LEA-1234`, `LEB-07-1234`, `ICT-AB-123`). It is saved in one spelling, capitals with parts joined by hyphens (`lea 1234` → `LEA-1234`), and is unique however it is spaced (`LEA1234` and `LEA 1234` are taken once `LEA-1234` exists); `fuelEfficiency` 1 to 100 km/l; `fuelTankCapacity` 1 to 1000 litres; `modelYear` between 1980 and next year; `vehicleType` (`Motorcycle`, `Rickshaw`, `Car`, `SUV/Jeep`, `Van/Pickup`, `Bus/Truck`); `engineCC` (whole number; not for `Electric`, where it is dropped). The engine, fuel efficiency and tank must also fit the type's range (e.g. a Motorcycle 50 to 1,300 cc, 20 to 100 km/l, 5 to 25 litres; see `VEHICLE_TYPE_LIMITS` in `shared/constants.js`); electric vehicles skip only the engine check. Number fields accept JSON numbers or plain number text (`"15"`, `"12.5"`); text such as `"1e3"` is refused (the same applies to fuel records and budgets). `PUT /vehicles/:id` applies the same rules to the fields it receives, and the type rules to the vehicle as it will be saved, so an older vehicle without `vehicleType`/`engineCC` must get them in its next update.
- `GET /vehicles`
- `GET /vehicles/:id`
- `PUT /vehicles/:id`
- `DELETE /vehicles/:id`

Deleting a vehicle also deletes its fuel records and budgets.

## Fuel records
- `POST /fuel-records` — `vehicle` (id), `date` (`YYYY-MM-DD`, not in the future, Pakistan time), `quantity` (litres, > 0 and not more than the vehicle's tank), `totalCost` (Rs, > 0), `odometer` (km, 0 to 9,999,999) unless `odometerNotWorking: true` ("My odometer is not working"; then no reading is saved), optional `station`. A reading may not be lower than the vehicle's highest reading on an earlier date, nor higher than its lowest reading on a later date (entries on the same day are not compared). Price per litre is calculated by the server and must come out between Rs 100 and Rs 1,000. Electric vehicles are rejected.
- `GET /fuel-records?vehicle=&from=&to=` — all filters optional; dates are `YYYY-MM-DD` and inclusive. Newest first.
- `GET /fuel-records/:id`
- `PUT /fuel-records/:id` — any of the fields above; send `""` for `station` to clear it, or `odometerNotWorking: true` to remove the reading. An entry without a reading counts as "odometer not working". The tank and reading-order rules run only when the vehicle, quantity, date or reading changes.
- `DELETE /fuel-records/:id`

Users see only records for their own vehicles; admins see all.

## Reports
- `GET /reports?from=YYYY-MM&to=YYYY-MM&vehicle=&fuelType=&user=` returns `report`. All filters are optional:
  - `from`/`to` default to the last 12 months (this month included), at most 10 years; `from` must not be after `to`.
  - `fuelType` is `Petrol`, `Diesel` or `Electric`.
  - `user` works for admins only (others always get their own data). Admins see every user's data by default.
- `report` fields:
  - `from`, `to`, `grouping`: `month`, or `year` when the range is longer than 24 months.
  - `totals`: `{ entries, litres, cost }`.
  - `periods`: one `{ period, litres, cost }` per month (`"2026-10"`) or year (`"2026"`) in the range, including empty ones.
  - `vehicles`: one row per vehicle with entries in the range: `{ vehicle: { _id, vehicleName, registrationNumber, fuelType, ownerName }, entries, litres, cost, mileage }`.
  - `mileage`: `{ kmPerLitre, distanceKm, source, skippedGaps }`, measured gap by gap between consecutive odometer readings (gap distance ÷ litres bought in the gap). A gap above 2× the vehicle's `fuelEfficiency` means fill-ups were not recorded, so it is skipped and counted in `skippedGaps`. `source: "odometer"`: `kmPerLitre` = counted distance ÷ counted litres. With no usable gap it is the vehicle's `fuelEfficiency`, with `source: "estimate"` and `distanceKm: null`.

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
- `GET /admin/vehicles?user=&registrationNumber=` (the registration search ignores spaces and hyphens: `lea 12` finds `LEA-1234`)
