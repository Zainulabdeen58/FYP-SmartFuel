# Smart Fuel Optimization and Resource Management System

Prototype for the Spring 2026 CS619 requirements.

## Stack
- Frontend: React + Vite + Axios + React Router
- Backend: Node.js + Express
- Database: MongoDB + Mongoose
- Authentication: JWT + bcrypt

## Implemented requirements
- Individual/Admin registration and login
- JWT authentication and logout
- Profile viewing/updating
- Individual users can manage only their own vehicles
- Admins can manage all users and vehicles
- Vehicle CRUD (create, read, update, delete)
- Admin user view/update/delete
- Admin vehicle search, update, and delete
- RESTful API integration with React frontend

## Run

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

## Important
The assignment explicitly asks the registration form to include User type/role (Individual and Admin), so this prototype includes that field.
