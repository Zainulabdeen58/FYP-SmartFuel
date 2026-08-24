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
- Vehicle CRUD
- Admin vehicle search by user or registration number
- RESTful API integration with React frontend

## Run

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Set MONGO_URI and JWT_SECRET in .env
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

The frontend expects the backend at `http://localhost:5000/api` by default.

## MongoDB
Use a local MongoDB instance or a MongoDB connection string in `backend/.env`.

## Important
The assignment explicitly asks the registration form to include User type/role (Individual and Admin), so this prototype includes that field.
