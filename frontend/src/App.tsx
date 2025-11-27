import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import AdminLogin from './pages/AdminLogin';
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/AdminDashboard';
import ManageReports from './pages/ManageReports';
import PlaceholderPage from './pages/PlaceholderPage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/admin/login" replace />} />
          <Route path="/admin/login" element={<AdminLogin />} />

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
            <Route path="users" element={<PlaceholderPage title="User Management" />} />
            <Route path="claims" element={<PlaceholderPage title="Claim Management" />} />
            <Route path="ai-matches" element={<PlaceholderPage title="AI Matches" />} />
            <Route path="analytics" element={<PlaceholderPage title="Analytics" />} />
          </Route>

          <Route path="*" element={<Navigate to="/admin/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
