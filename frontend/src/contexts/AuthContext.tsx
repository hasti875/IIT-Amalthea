import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

type UserRole = 'admin' | 'employee' | 'manager';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  role: UserRole;
  department?: string;
  position?: string;
  employeeId?: string;
  company: {
    id: string;
    name: string;
    country: string;
    baseCurrency: {
      code: string;
      name: string;
      symbol: string;
    };
  };
}

interface SignUpData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  companyName: string;
  country: string;
  baseCurrency: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: UserRole | null;
  loading: boolean;
  signUp: (userData: SignUpData) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('token');
      if (savedToken) {
        setToken(savedToken);
        await fetchCurrentUser(savedToken);
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const fetchCurrentUser = async (authToken: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.data.user);
        setRole(data.data.user.role);
      } else {
        // Token is invalid, clear it
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        setRole(null);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      setRole(null);
    }
  };

  const signUp = async (userData: SignUpData) => {
    try {
      console.log('Attempting signup with:', userData);
      console.log('API URL:', `${API_BASE_URL}/auth/register`);
      
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok) {
        const { user: newUser, token: newToken } = data.data;
        console.log('Signup successful, user:', newUser);
        setUser(newUser);
        setToken(newToken);
        setRole(newUser.role);
        localStorage.setItem('token', newToken);
        return { error: null };
      } else {
        console.error('Signup failed:', data);
        return { error: data.message || 'Registration failed' };
      }
    } catch (error) {
      console.error('Sign up network error:', error);
      return { error: 'Network error. Please check if the backend server is running.' };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Attempting login with:', { email, apiUrl: `${API_BASE_URL}/auth/login` });
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log('Login response:', { status: response.status, data });

      if (response.ok) {
        const { user: loggedInUser, token: newToken } = data.data;
        setUser(loggedInUser);
        setToken(newToken);
        setRole(loggedInUser.role);
        localStorage.setItem('token', newToken);
        return { error: null };
      } else {
        return { error: data.message || 'Login failed' };
      }
    } catch (error) {
      console.error('Sign in error:', error);
      return { error: 'Network error. Please try again.' };
    }
  };

  const signOut = async () => {
    setUser(null);
    setToken(null);
    setRole(null);
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, role, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};