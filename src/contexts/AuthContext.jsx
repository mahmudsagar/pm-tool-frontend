import { createContext, useContext, useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Check if user and token are stored in localStorage on initial load
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");
    
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    if (storedToken) {
      setToken(storedToken);
    }
    
    setLoading(false);
  }, []);

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
        
        // Store token and user data
        setToken(authToken);
        setUser(userData);
        
        // Save to localStorage
        localStorage.setItem("token", authToken);
        localStorage.setItem("user", JSON.stringify(userData));
        
        // toast({
        //   title: "Login successful",
        //   description: Array.isArray(responseData.message[0]?.success) 
        //     ? responseData.message[0].success[0] 
        //     : "Welcome back!",
        // });
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
      
      // Clear user and token from state and localStorage
      setUser(null);
      setToken(null);
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      
      // toast({
      //   title: "Logged out",
      //   description: "You have been logged out successfully",
      // });
    } catch (error) {
      // toast({
      //   title: "Logout error",
      //   description: "You were logged out of the UI, but the server logout failed",
      //   variant: "destructive",
      // });
      // Still clear the local state
      setUser(null);
      setToken(null);
      localStorage.removeItem("user");
      localStorage.removeItem("token");
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
        
        // Store token and user data
        setToken(authToken);
        setUser(userData);
        
        // Save to localStorage
        localStorage.setItem("token", authToken);
        localStorage.setItem("user", JSON.stringify(userData));
        
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
    token,
    loading,
    login,
    logout,
    register,
    authFetch,
    isAuthenticated: !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
