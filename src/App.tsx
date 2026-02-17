import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider.tsx';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Leave from './pages/Leave/Leave';
import OfficeTracker from './pages/office/OfficeTracker';
import Profile from './pages/Profile/Profile';
import { ROUTES } from './constants/routes.ts';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path={ROUTES.LOGIN} element={<Login />} />
          <Route path={ROUTES.REGISTER} element={<Register />} />

          {/* Root redirect to dashboard */}
          <Route
            path={ROUTES.ROOT}
            element={<Navigate to={ROUTES.DASHBOARD} replace />}
          />

          {/* Protected Routes */}
          <Route
            path={ROUTES.APP_ROOT}
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route
              index
              element={<Navigate to={ROUTES.DASHBOARD} replace />}
            />
            <Route path="leave" element={<Leave />} />
            <Route path="office-tracker" element={<OfficeTracker />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          {/* Catch-all redirect to login */}
          <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;