import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { FacilityProvider } from './contexts/FacilityContext';
import { PWAProvider } from './contexts/PWAContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { UnauthorizedHandler } from './components/auth/UnauthorizedHandler';
import { SessionExpiredHandler } from './components/auth/SessionExpiredHandler';
import { UpdateBanner } from './components/pwa/UpdateBanner';
import { useFacilityTheme } from './hooks/useFacilityTheme';
import { LoginPage } from './pages/LoginPage';
import { GeriatricLoginPage } from './pages/GeriatricLoginPage';
import { SelectFacilityPage } from './pages/SelectFacilityPage';
import { PlatformPage } from './pages/PlatformPage';
import { GeriatricDashboardPage } from './pages/GeriatricDashboardPage';
import { GeriatricTasksPage } from './pages/GeriatricTasksPage';
import { GeriatricMedicalPage } from './pages/GeriatricMedicalPage';
import { ResidentsListPage } from './pages/ResidentsListPage';
import { ResidentDetailPage } from './pages/ResidentDetailPage';
import { MedicationDuePage } from './pages/MedicationDuePage';
import { FinancePage } from './pages/FinancePage';
import { StaffPage } from './pages/StaffPage';
import { AttendancePage } from './pages/AttendancePage';
import { DebugPage } from './pages/DebugPage';

function AppContent() {
  // Aplicar theme de facility activa (resetea a defaults si no hay activeMembership)
  useFacilityTheme();

  return (
    <BrowserRouter>
      <UnauthorizedHandler />
      <SessionExpiredHandler />
      <UpdateBanner />
      <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/login/:geriatricSlug" element={<GeriatricLoginPage />} />
            <Route
              path="/select-facility"
              element={
                <ProtectedRoute requireFacility={false}>
                  <SelectFacilityPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/platform"
              element={
                <ProtectedRoute requirePlatformAdmin={true} requireFacility={false}>
                  <PlatformPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/g/:id/dashboard"
              element={
                <ProtectedRoute requireRole="ADMIN">
                  <GeriatricDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/g/:id/tasks"
              element={
                <ProtectedRoute requireRole="STAFF">
                  <GeriatricTasksPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/g/:id/medical"
              element={
                <ProtectedRoute requireRole="MEDICO">
                  <GeriatricMedicalPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/residents"
              element={
                <ProtectedRoute>
                  <ResidentsListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/residents/:id"
              element={
                <ProtectedRoute>
                  <ResidentDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/medication-due"
              element={
                <ProtectedRoute>
                  <MedicationDuePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/finance"
              element={
                <ProtectedRoute requireOwner={true}>
                  <FinancePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff"
              element={
                <ProtectedRoute requireOwner={true}>
                  <StaffPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/attendance"
              element={
                <ProtectedRoute requireOwner={true}>
                  <AttendancePage />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/residents" replace />} />
            {import.meta.env.DEV && (
              <Route path="/debug" element={<DebugPage />} />
            )}
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <PWAProvider>
      <AuthProvider>
        <FacilityProvider>
          <AppContent />
        </FacilityProvider>
      </AuthProvider>
    </PWAProvider>
  );
}

export default App;
