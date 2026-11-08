# REST API

Base URL: `/api`

Every response is JSON. Errors look like `{ "success": false, "message": "..." }`
with status 400 (invalid input or id), 401 (missing/expired token), 403 (not allowed),
404 (not found), 409 (email or registration number already in use), 422 (no road route between two places),
429 (too many attempts) or 503 (the route service is not set up or not working). Route-service problems
are never answered with 401, because the frontend signs the user out on any 401.

## Authentication
- `POST /auth/register` — `fullName`, `email`, `contactNumber`, `role` (`Individual` or `Organizational`; `Admin` is rejected), `password` (8-64 characters, letters and numbers). Limited to 10 registrations per IP per hour. `organizationName` is required when `role` is `Organizational`.
- `POST /auth/login` — `email`, `password`. After 10 failed attempts from one IP in 15 minutes it returns 429.
- `POST /auth/logout` (Bearer token)

## Profile
- `GET /users/profile` — the same user shape as login (`id`, `fullName`, `email`, `contactNumber`, `role`, `organizationName`, `crisisMode`)
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

## Trips (FR-05, FR-06)
A trip is a planned journey from `start` to `destination` (each `{ name, lat, lng }` inside Pakistan) by one vehicle on one day (`YYYY-MM-DD`, Pakistan time). Routes come from OpenRouteService through the server; the key never reaches the browser. Admins can read every trip but get 403 on changes.
- `GET /trips?vehicle=&status=&user=` returns `trips` (newest date first, without the route lines). `status` is `planned`, `completed`, `postponed` or `combined`; `user` works for admins only.
- `GET /trips/estimate-basis?vehicle=<id>` returns `basis`: `{ fuelType, kmPerLitre, mileageSource, tankRangeKm, latestPrice }`. `kmPerLitre` is the mileage measured from odometer readings over the last 12 months once at least 300 km were measured (`mileageSource: "odometer"`), otherwise the vehicle's `fuelEfficiency` (`"stated"`). `latestPrice` is `{ pricePerLitre, date }` of the vehicle's latest fuel entry in that time, or `null`. All null for electric vehicles.
- `POST /trips` with `vehicle`, `start`, `destination`, `date` (today up to 365 days ahead), `priority` (`essential` or `non-essential`), optional `purpose` (up to 200 characters) and `pricePerLitre` (Rs 100 to 1,000; required except for electric vehicles). A new trip is always `planned`. Start and destination must be at least 0.2 km apart. Returns 201 with the trip; when the route service fails the trip is still saved, without routes, with `routeError` and the message "Trip saved, but routes could not be calculated: …".
- Trip fields besides the above: `status` (`planned`, `completed`, or `postponed`/`combined` after an accepted crisis mode suggestion), `combinedInto` (the trip a combined trip is done with), `ignoredSuggestions` (crisis mode suggestion types ignored for this trip), `kmPerLitre`, `mileageSource`, `pricePerLitre`, `tankRangeKm` (the estimate basis saved with the trip), `routes`, `recommendedRoute` and `selectedRoute` (indexes into `routes`), `routeError`, `routesCalculatedAt`.
- Each route: `{ label, distanceKm, durationMin, litres, cost, needsRefuel, geometry }`. Labels are `Fastest`, `Shortest` and `Avoids motorways` (ORS gives alternative routes only under 100 km, so these are separate requests; duplicates are dropped). Motorcycles and rickshaws get only `Fastest` and `Shortest`, both avoiding motorways; buses/trucks use the `driving-hgv` profile. `litres` = km ÷ km/l and `cost` = litres × price (null for electric). `needsRefuel` is true when the route is longer than km/l × tank. `geometry` is an encoded polyline. `recommendedRoute`: the fewest litres among routes taking at most 1.5 × the fastest time.
- `GET /trips/:id` returns one trip with route lines. This and every other single-trip answer (create, update, recalculate, plan again) has `vehicle` and `user` filled in, `combinedInto` as `{ _id, start, destination, date, status }` and `combinedTrips` (the trips combined into this one).
- `PUT /trips/:id` changes any of the create fields, `status` (`planned` or `completed`) and `selectedRoute`. A new vehicle or new places get new routes; a new price only recalculates the rupees. The date rule runs only when the date or status changes: planned trips today or later, completed trips today or earlier. Postponed and combined trips can't be changed (400) until planned again. Completing a trip also completes the trips combined into it.
- `POST /trips/:id/routes` asks the route service again (planned trips only).
- `POST /trips/:id/plan-again` makes a postponed or combined trip planned again (undoes the crisis mode suggestion, which is then not made again for this trip). The date is not checked; a passed day makes the trip overdue.
- `DELETE /trips/:id`. Trips combined into it become planned again (also when its vehicle is deleted).
- Trips, edits and recalculations are limited to 20 per user per 10 minutes.

## Crisis mode (FR-07)
For Individual and Organizational accounts (admins get 403). Each user turns it on for themselves. Suggestions are never stored: they are worked out from the user's planned trips from today on, on every request.
- `PUT /crisis/mode` with `enabled` (`true` or `false`) returns the updated `user`. Turning it off only hides the suggestions; no trip changes.
- `GET /crisis` returns `crisisMode` and `advice` (`null` while off): `{ plannedTrips, suggestions, totalSaving, budget, hasIgnoredSuggestions }`.
  - Each suggestion: `{ id, type, trips, saving }` (`routeLabel` and `recommendedRoute` too for `route`). `trips` are `{ _id, start, destination, date, priority, vehicle }`; `saving` is `{ km, litres, cost }`, an estimate (litres and cost 0 for electric vehicles). A trip is in at most one suggestion, checked in this order:
    - `combine`: trips on the same day whose starts are within 5 km of each other and whose destinations are too. The first trip (an essential one, then the longest) is the main trip; the others become extra stops on it. Saving: the others' km minus the extra stops (straight line × 1.3).
    - `postpone`: a `non-essential` trip; saving: the whole trip.
    - `route`: the chosen route is longer than the recommended one; saving: the extra km.
  - A trip without routes is counted as the straight line × 1.3. Suggestions saving under 1 km, and combinations that would use more fuel, are left out.
  - `budget` (`null` without an overall budget this month): `{ month, plannedCost, remaining, isShort }`: `plannedCost` is this month's planned trips, `remaining` what is left of the budget after this month's fuel entries, and `isShort` means `plannedCost` is more than `remaining`.
- `POST /crisis/suggestions/:id/accept`: `combine` marks the other trips `combined` (with `combinedInto`), `postpone` marks the trip `postponed`, `route` selects the recommended route. 400 while crisis mode is off; 404 when the suggestion no longer exists (its trips changed).
- `POST /crisis/suggestions/:id/ignore` hides the suggestion (stored on its trips in `ignoredSuggestions`); the trips don't change.
- `DELETE /crisis/ignored` shows every ignored suggestion again.

## Notifications (FR-13)
For Individual and Organizational accounts (admins get 403). Notifications are made by the server after a change is saved, never through this API, and each event makes at most one (a unique `{ user, key }` index). MongoDB deletes them 60 days after they were made.
- Events (`type`):
  - `budget-warning` and `budget-over`: after a fuel record is added or edited, or a budget is saved, a budget of that month (overall or a vehicle's) has reached 80% or 100%. Once per budget per month; a budget that jumps past 100% gets only `budget-over`. The vehicle's owner is notified, also when an admin adds the record. Link: `/dashboard`.
  - `inefficient-trip`: a planned trip's chosen route needs 15% or more fuel than the recommended route (compared by km, so it also works for electric vehicles). Once per trip. Link: `/trips?trip=<id>`.
  - `crisis-suggestion`: while crisis mode is on, a saved trip (created, edited, recalculated or planned again) is part of a `combine` or `postpone` suggestion. Once per suggestion id; turning crisis mode on makes none (the page shows them), and a `route` suggestion is left to `inefficient-trip`. Link: `/crisis?suggestion=<id>`.
- `GET /notifications` returns `notifications` (the newest 50: `{ _id, type, message, link, read, createdAt }`) and `unreadCount` (all unread).
- `PUT /notifications/:id/read` marks one read and returns it. Another user's notification answers 404, like a missing one.
- `PUT /notifications/read-all` marks all of the user's notifications read.
- A link may point to something deleted since: `GET /trips/:id` then answers 404 and the crisis page says the suggestion is no longer available.

## Places
For the trip form; limited to 30 per user per 10 minutes. Results are cached on the server.
- `GET /places/search?text=` (3 to 100 characters) returns `places`: up to 5 `{ name, lat, lng }` in Pakistan, best first.
- `GET /places/reverse?lat=&lng=` returns `place` (`{ name, lat, lng }` or `null`): a name for a point picked on the map.

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
- `PUT /admin/users/:id` (changing the role also removes what the new role cannot have: all budgets and notifications for Admin, the vehicle budgets for Individual)
- `DELETE /admin/users/:id` (also deletes the user's vehicles, fuel records, budgets, trips and notifications)
- `GET /admin/vehicles?user=&registrationNumber=` (the registration search ignores spaces and hyphens: `lea 12` finds `LEA-1234`)
