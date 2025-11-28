import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
// Import the new API functions
import { fetchLogin, fetchLogout } from '../services/authApi'; 
import type { UserRole } from '../types/user';

// Define the User structure to match the Django serializer response
interface AuthUser {
    id: number;
    username: string;
    role: UserRole; // Assuming the serializer returns the role field
    name: string; // The combined name from Django's serializer
    // Include other fields returned by UserSerializer if needed
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null; // Use the real AuthUser type
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to check stored state (we will modify this slightly)
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
  const [user, setUser] = useState(initialState.user);

  // We rely solely on the initial state loading and API interactions, removing the redundant useEffect
  
  // REAL LOGIN IMPLEMENTATION
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
        const userData = await fetchLogin(username, password); // Call the real API
        
        // Map the backend response to the local AuthUser structure
        const authUser: AuthUser = {
            id: userData.id,
            username: userData.username,
            role: userData.role,
            name: userData.name, 
        };

        setIsAuthenticated(true);
        setUser(authUser);
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('user', JSON.stringify(authUser));
        return true;
    } catch (e) {
        console.error("Login failed:", e);
        return false;
    }
  };

  const logout = () => {
    // Send logout request to clear Django session
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