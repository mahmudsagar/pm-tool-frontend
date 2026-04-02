import { createContext, useContext, useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import useAuthStore from "@/stores/useAuthStore";
import { useInitAuth } from "@/hooks/queries/useAuthQueries";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  // Use Zustand store - subscribe to changes for reactive updates
  const { 
    user: storeUser, 
    token: storeToken, 
    login: storeLogin, 
    logout: storeLogout, 
    initializeAuth 
  } = useAuthStore();
  
  const [user, setUser] = useState(storeUser);
  const [token, setToken] = useState(storeToken);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Restore auth state from localStorage synchronously on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  // Validate token against server via TanStack Query — deduplicated, no double calls
  const { isLoading: isValidating, isError: isAuthError } = useInitAuth();

  useEffect(() => {
    if (!isValidating) setLoading(false);
  }, [isValidating]);

  // If server-side validation fails, clear the session
  useEffect(() => {
    if (isAuthError) storeLogout();
  }, [isAuthError]);

  // Keep local state in sync with Zustand store
  useEffect(() => {
    console.log('AuthContext: Store state changed', { storeUser, storeToken: !!storeToken });
    setUser(storeUser);
    setToken(storeToken);
  }, [storeUser, storeToken]);


  const removeUserSession = () => {
    try {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      setUser(null);
      setToken(null);
    } catch (error) {
      console.error("Error removing user session:", error);
    }
  }

  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await fetch(import.meta.env.BN_BASE_URL + '/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Login failed");
      }

      const responseData = await response.json();
      
      // Extract token and user data from the new response structure
      if (responseData.status === "success" && responseData.data) {
        const authToken = responseData.data.token;
        const userData = responseData.data.user_info;
        
        console.log('AuthContext: Login successful, updating store', { user: userData._id, hasToken: !!authToken });
        
        // Update Zustand store (which will trigger useEffect to update local state)
        storeLogin(authToken, userData);
        
        console.log('AuthContext: Store updated, returning true');
        return true;
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      toast({
        title: "Login failed",
        description: error.message || "An error occurred during login",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      // Call the logout API endpoint with token
      await fetch(import.meta.env.BN_BASE_URL + '/v1/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Clear from Zustand store (which also clears localStorage and triggers state update)
      storeLogout();
      removeUserSession();
    } catch (error) {
      // Still clear the local state even if API call fails
      storeLogout();
      removeUserSession();
    } finally {
      setLoading(false);
    }
  };

  // Utility function for authenticated requests
  const authFetch = async (url, options = {}) => {
    if (!token) {
      throw new Error("Not authenticated");
    }
    
    const authOptions = {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      }
    };
    
    return fetch(url, authOptions);
  };

  const register = async (email, password, name) => {
    setLoading(true);
    try {
      const response = await fetch(import.meta.env.BN_BASE_URL + '/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Registration failed");
      }

      const responseData = await response.json();
      
      // Extract token and user data from the new response structure
      if (responseData.status === "success" && responseData.data) {
        const authToken = responseData.data.token;
        const userData = responseData.data.user_info;
        
        // Update Zustand store (which will trigger useEffect to update local state)
        storeLogin(authToken, userData);
        
        toast({
          title: "Registration successful",
          description: Array.isArray(responseData.message[0]?.success) 
            ? responseData.message[0].success[0] 
            : "Your account has been created",
        });
        return true;
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      toast({
        title: "Registration failed",
        description: error.message || "An error occurred during registration",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    setUser,
    token,
    setToken,
    loading,
    login,
    logout,
    register,
    removeUserSession,
    authFetch,
    isAuthenticated: !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
