import { Navigate, useLocation } from "react-router-dom";
import useAuthStore from "@/stores/useAuthStore";

export function ProtectedRoute({ children }) {
  const { loading, token, isAuthenticated } = useAuthStore();
  const location = useLocation();

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }  
  // Redirect to login if not authenticated
  if (!token || !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // User is authenticated, render protected content
  return children;
}
