import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Admin Imports
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import ManageReports from './pages/admin/Reports';
import UserManagement from './pages/UserManagement';
import ClaimManagement from './pages/ClaimManagement';
import Analytics from './pages/Analytics';
import AIMatchNotification from './pages/admin/AIMatchNotification';

// User Imports
// WE USE ONE UNIFIED LOGIN NOW
import UserLogin from './pages/user/Login'; 
import UserHome from './pages/user/Home';
import ReportLost from './pages/user/ReportLost';
import ReportFound from './pages/user/ReportFound';
import ReportSuccess from './pages/user/ReportLostSuccess';
import ReportFoundSuccess from './pages/user/ReportFoundSuccess';
import UserProfile from './pages/user/Profile';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* --- PUBLIC ROUTES --- */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<UserLogin />} />
          {/* Redirect old admin login to the unified login */}
          <Route path="/admin/login" element={<Navigate to="/login" replace />} />

          {/* --- PROTECTED USER ROUTES (Access: Student, Teacher, Admin) --- */}
          <Route path="/home" element={
            <ProtectedRoute allowedRoles={['Student', 'Teacher', 'Admin']}>
              <UserHome />
            </ProtectedRoute>
          } />
          
          <Route path="/report-lost" element={
            <ProtectedRoute allowedRoles={['Student', 'Teacher', 'Admin']}>
              <ReportLost />
            </ProtectedRoute>
          } />

          <Route path="/report-found" element={
            <ProtectedRoute allowedRoles={['Student', 'Teacher', 'Admin']}>
              <ReportFound />
            </ProtectedRoute>
          } />

          <Route path="/report-success" element={
            <ProtectedRoute allowedRoles={['Student', 'Teacher', 'Admin']}>
              <ReportSuccess />
            </ProtectedRoute>
          } />

          <Route path="/report-found-success" element={
            <ProtectedRoute allowedRoles={['Student', 'Teacher', 'Admin']}>
              <ReportFoundSuccess />
            </ProtectedRoute>
          } />

          <Route path="/profile" element={
            <ProtectedRoute allowedRoles={['Student', 'Teacher', 'Admin']}>
              <UserProfile />
            </ProtectedRoute>
          } />

          {/* --- PROTECTED ADMIN ROUTES (Access: Admin Only) --- */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
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

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
          
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;