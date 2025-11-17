import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '@/stores/useAuthStore';
import { api } from '@/utils/api';

export default function AuthGuard({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, token, logout } = useAuthStore();
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setIsValidating(false);
        return;
      }

      try {
        // Optional: Verify the token on the server
        await api.get('/api/auth/validate');
        setIsValidating(false);
      } catch (error) {
        // Token is invalid, logout
        logout();
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token, logout]);

  useEffect(() => {
    if (!isAuthenticated && !isValidating && location.pathname !== '/login') {
      navigate('/login');
    }
  }, [isAuthenticated, isValidating, navigate, location]);

  // Show loading during validation
  if (isValidating) {
    return <div className="flex justify-center items-center h-screen">Validating session...</div>;
  }

  return children;
}
