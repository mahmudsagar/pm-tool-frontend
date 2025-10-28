import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { authBaseUrl } from "@/utils/constants";

export function ProtectedRoute({ children }) {
  const { loading, token, removeUserSession } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isTokenVerifying, setIsTokenVerifying] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (token) {
      setError(null);
      fetch(authBaseUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      })
        .then(response => {
          if (!response.ok) {
            throw new Error('Token verification failed');
          }
          return response.json();
        })
        .then(data => {
          // console.log(data, 'verify token result');
          setIsTokenVerifying(false);
        })
        .catch(err => {
          setError(err);
        })
        .finally(() => {
          setIsTokenVerifying(false);
        })
    } else {
      setIsTokenVerifying(false);
    }
  }, [token]);

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
