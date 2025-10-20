import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import useApi from "@/lib/dataFetcher";
import { useEffect } from "react";
import { authBaseUrl } from "@/utils/constants";

export function ProtectedRoute({ children }) {
  const { loading, token, logout } = useAuth();
  const { loading: authLoading, callApi, error } = useApi();
  const location = useLocation();
  const navigate = useNavigate();



  useEffect(() => {
    if (token) {
      callApi(authBaseUrl)
    }
  }, [token, callApi]);


  useEffect(() => {
    if (error) {
      logout();
      navigate('/login', { replace: true });
    }
  }, [navigate, error, logout]);

  if (loading || authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
