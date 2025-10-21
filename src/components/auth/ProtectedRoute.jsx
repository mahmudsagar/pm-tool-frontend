import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import useApi from "@/lib/dataFetcher";
import { useEffect, useLayoutEffect } from "react";
import { authBaseUrl } from "@/utils/constants";

export function ProtectedRoute({ children }) {
  const { loading, token, removeUserSession } = useAuth();
  const { loading: isTokenVerifying, callApi, error } = useApi();
  const location = useLocation();
  const navigate = useNavigate();

  useLayoutEffect(() => {
    if (token) {
      callApi(authBaseUrl)
    }
  }, [token, callApi]);

  useEffect(() => {
    if (error) {
      removeUserSession();
      navigate('/login', { replace: true });
    }
  }, [navigate, error, removeUserSession]);

  if (loading || isTokenVerifying) {
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
