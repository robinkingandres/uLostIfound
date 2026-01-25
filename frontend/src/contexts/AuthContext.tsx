import { createContext, useContext, useState, type ReactNode } from 'react';
import { fetchLogin, fetchLogout } from '../services/authApi'; 
import type { UserRole } from '../types/user';

interface AuthUser {
    id: number;
    username: string;
    role: UserRole;
    name: string;
    userId: string; // Maps to school_id
    email: string;
    avatar?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  // CHANGED: login now returns the User object (or null) instead of boolean
  login: (username: string, password: string) => Promise<AuthUser | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getInitialState = (): { isAuthenticated: boolean; user: AuthUser | null } => {
    try {
        const storedAuth = localStorage.getItem('isAuthenticated');
        const storedUser = localStorage.getItem('user');
        if (storedAuth === 'true' && storedUser) {
            return {
                isAuthenticated: true,
                user: JSON.parse(storedUser) as AuthUser,
            };
        }
    } catch (e) {
        console.error("Error parsing stored user data:", e);
        localStorage.clear();
    }
    return { isAuthenticated: false, user: null };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const initialState = getInitialState();
  const [isAuthenticated, setIsAuthenticated] = useState(initialState.isAuthenticated);
  const [user, setUser] = useState<AuthUser | null>(initialState.user);

  // CHANGED: Return AuthUser | null
  const login = async (username: string, password: string): Promise<AuthUser | null> => {
    try {
        const userData = await fetchLogin(username, password);
        
        const authUser: AuthUser = {
            id: userData.id,
            username: userData.username,
            role: userData.role,
            name: userData.name, 
            userId: userData.userId, // Capture School ID
            email: userData.email,   // Capture Email
            avatar: userData.avatar  // Capture Avatar
        };

        setIsAuthenticated(true);
        setUser(authUser);
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('user', JSON.stringify(authUser));
        
        return authUser; // Return the user object so we can check roles immediately
    } catch (e) {
        console.error("Login failed:", e);
        return null;
    }
  };

  const logout = () => {
    fetchLogout(); 
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}