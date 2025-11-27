import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Admin Imports
import AdminLayout from './layouts/AdminLayout';
import AdminLogin from './pages/admin/Login';
import AdminDashboard from './pages/admin/Dashboard';
import ManageReports from './pages/admin/Reports';
import UserManagement from './pages/UserManagement';
import ClaimManagement from './pages/ClaimManagement';
import Analytics from './pages/Analytics';
import PlaceholderPage from './pages/PlaceholderPage';
import AIMatchNotification from './pages/admin/AIMatchNotification';

// User Imports
import UserLogin from './pages/user/Login'; // Import the new page
import UserHome from './pages/user/Home';
import ReportLost from './pages/user/ReportLost';
import ReportFound from './pages/user/ReportFound';
import ReportSuccess from './pages/user/ReportLostSuccess';
import ReportFoundSuccess from './pages/user/ReportFoundSuccess';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* --- USER ROUTES --- */}
          
          {/* Default Route: Redirects to User Login for now */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* User Login Page */}
          <Route path="/login" element={<UserLogin />} />

              
          {/* User Landing Page */}
          <Route path="/home" element={<UserHome />} />

              
          {/* User Report Lost Item */}
          <Route path="/report-lost" element={<ReportLost />} />

          {/* User Report Found Item */}
          <Route path="/report-found" element={<ReportFound />} />

          
          {/* User Submit Lost Item */}
          <Route path="/report-success" element={<ReportSuccess />} />

          {/* User Submit Lost Item */}
          <Route path="/report-found-success" element={<ReportFoundSuccess />} />
          
          {/* Placeholder for when user logs in */}
          <Route path="/home" element={<PlaceholderPage title="User Homepage" />} />


          {/* --- ADMIN ROUTES --- */}
          
          {/* Admin Login */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Protected Admin Dashboard Area */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="reports" element={<ManageReports />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="claims" element={<ClaimManagement />} />
           <Route path="ai-matches" element={<AIMatchNotification />} />
            
            <Route path="analytics" element={<Analytics />} />
          </Route>

          {/* Catch-all: Redirect to user login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
          
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;