# Smart Fuel Optimization and Resource Management System

Prototype for the Spring 2026 CS619 requirements.

## Stack
- Frontend: React + Vite + Axios + React Router
- Backend: Node.js + Express
- Database: MongoDB + Mongoose
- Authentication: JWT + bcrypt

## Implemented requirements
- Individual and Organizational registration and login (Admin cannot self-register)
- JWT authentication and logout
- Profile viewing/updating
- Individual users can manage only their own vehicles
- Admins can manage all users and vehicles
- Vehicle CRUD (create, read, update, delete)
- Admin user view/update/delete
- Admin vehicle search, update, and delete
- RESTful API integration with React frontend

## Run

From the project root, one command starts both the backend and the frontend:

```bash
npm run install:all   # first time only
npm run dev
```

Or run each one separately:

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

The frontend expects the backend at `http://localhost:5000/api`.

## MongoDB
Use a local MongoDB instance at `mongodb://localhost:27017`.

## Admin accounts
The registration form offers only Individual and Organizational accounts, so nobody can make themselves an admin.
Admins are created by a seeder. Put `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_CONTACT` and `ADMIN_PASSWORD`
in `backend/.env` (see `.env.example`), then run:

```bash
cd backend
npm run seed:admin
```

Running it again does nothing if that admin already exists. An existing admin can also change any user's role on the Administration page.
