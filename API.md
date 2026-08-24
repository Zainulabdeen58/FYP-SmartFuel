# REST API

Base URL: `/api`

## Authentication
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout` (Bearer token)

## Profile
- `GET /users/profile`
- `PUT /users/profile`

## Vehicles
- `POST /vehicles`
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
