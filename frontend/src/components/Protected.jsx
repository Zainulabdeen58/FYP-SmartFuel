import { Navigate } from "react-router-dom";

function Protected({ user, children }) {
  return user ? children : <Navigate to="/login" replace />;
}

export default Protected;
