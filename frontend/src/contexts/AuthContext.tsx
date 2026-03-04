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
    yearLevel?: string;
    room?: string;
    gender?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<AuthUser | null>;
  logout: () => void;
  refreshUser: (userData: any) => void;
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

  const login = async (username: string, password: string): Promise<AuthUser | null> => {
    try {
        const userData = await fetchLogin(username, password);
        
        const authUser: AuthUser = {
            id: userData.id,
            username: userData.username,
            role: userData.role,
            name: userData.name, 
            userId: userData.userId || userData.school_id, 
            email: userData.email,   
            avatar: userData.avatar,
            // Maps both possibilities to ensure yearLevel is never undefined
            yearLevel: userData.yearLevel || userData.year_level,
            room: userData.room,
            gender: userData.gender
        };

        setIsAuthenticated(true);
        setUser(authUser);
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('user', JSON.stringify(authUser));
        
        return authUser; 
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

  const refreshUser = (userData: any) => {
    // Map data here so that profile updates don't break the UI fields
    const formattedUser: AuthUser = {
        ...userData,
        userId: userData.userId || userData.school_id,
        yearLevel: userData.yearLevel || userData.year_level,
    };
    setUser(formattedUser);
    localStorage.setItem('user', JSON.stringify(formattedUser));
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, refreshUser }}>
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