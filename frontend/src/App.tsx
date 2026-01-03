import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { FacilityProvider } from './contexts/FacilityContext';
import { PWAProvider } from './contexts/PWAContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { UnauthorizedHandler } from './components/auth/UnauthorizedHandler';
import { SessionExpiredHandler } from './components/auth/SessionExpiredHandler';
import { SessionBootstrap } from './components/auth/SessionBootstrap';
import { Header } from './components/layout/Header';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import HomeRedirect from './components/navigation/HomeRedirect';
import { useFacilityTheme } from './hooks/useFacilityTheme';
import { LoginPage } from './pages/LoginPage';
import { GeriatricLoginPage } from './pages/GeriatricLoginPage';
import { SelectFacilityPage } from './pages/SelectFacilityPage';
import { PlatformPage } from './pages/PlatformPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { ImpersonationBanner } from './components/admin/ImpersonationBanner';
import { UpdateBanner } from './components/pwa/UpdateBanner';
import GeriatricDashboardPage from './pages/GeriatricDashboardPage';
import GeriatricTasksPage from './pages/GeriatricTasksPage';
import GeriatricMedicalPage from './pages/GeriatricMedicalPage';
import CertificatesPage from './pages/CertificatesPage';
import CertificatePrintPage from './pages/CertificatePrintPage';
import { ResidentsListPage } from './pages/ResidentsListPage';
import { ResidentDetailPage } from './pages/ResidentDetailPage';
import { MedicationDuePage } from './pages/MedicationDuePage';
import { FinancePage } from './pages/FinancePage';
import { StaffManagementPage } from './pages/StaffManagementPage';
import { AttendancePage } from './pages/AttendancePage';
import { DebugPage } from './pages/DebugPage';
import ClinicalHistorySearchPage from './pages/ClinicalHistorySearchPage';
import ClinicalHistoryPage from './pages/ClinicalHistoryPage';
import ClinicalHistoryPrintPage from './pages/ClinicalHistoryPrintPage';
import { CurrentlyWorkingPage } from './pages/CurrentlyWorkingPage';
import { ShiftsManagementPage } from './pages/ShiftsManagementPage';
import { ShiftAssignmentsPage } from './pages/ShiftAssignmentsPage';
import MedicalFolderSearchPage from './pages/MedicalFolderSearchPage';
import MedicalFolderPage from './pages/MedicalFolderPage';
import MedicalFolderPrintPage from './pages/MedicalFolderPrintPage';
import PrescriptionsHistorySearchPage from './pages/PrescriptionsHistorySearchPage';
import PrescriptionsHistoryPage from './pages/PrescriptionsHistoryPage';
import PrescriptionPrintPage from './pages/PrescriptionPrintPage';
import ResidentPrintPage from './pages/ResidentPrintPage';
import ActivityFeedPage from './pages/ActivityFeedPage';
import MyAccountPage from './pages/MyAccountPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import { OwnerDashboardPage } from './pages/OwnerDashboardPage';

function AppContent() {
  useFacilityTheme();
  const location = useLocation();
  
  const isPublic = location.pathname.startsWith('/login') ||
                   location.pathname.startsWith('/reset-password');

  return (
    <>
      <UnauthorizedHandler />
      <SessionExpiredHandler />
      <ImpersonationBanner />
      <UpdateBanner />
      {!isPublic && <Header />}
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<Navigate to="/login" replace />} />
        <Route path="/verify-email" element={<Navigate to="/login" replace />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/login/:geriatricSlug" element={<GeriatricLoginPage />} />

        {/* Rutas de selección/plataforma */}
        <Route
          path="/select-facility"
          element={
            <ProtectedRoute requireFacility={false}>
              <SelectFacilityPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mi-cuenta"
          element={
            <ProtectedRoute requireFacility={false}>
              <MyAccountPage />
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
          path="/admin/users"
          element={
            <ProtectedRoute requirePlatformAdmin={true} requireFacility={false}>
              <AdminUsersPage />
            </ProtectedRoute>
          }
        />

        {/* Rutas del hogar (facility-specific) */}
        <Route
          path="/g/:id/dashboard"
          element={
            <ProtectedRoute requireRole="ADMIN">
              <GeriatricDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/g/:id/owner"
          element={
            <ProtectedRoute requireOwner={true}>
              <OwnerDashboardPage />
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
            <ProtectedRoute requireRoles={['MEDICO', 'ADMIN']}>
              <GeriatricMedicalPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/g/:id/certificates"
          element={
            <ProtectedRoute requireRole="MEDICO">
              <CertificatesPage />
            </ProtectedRoute>
          }
        />

        {/* Certificados - Print */}
        <Route path="/certificates/print" element={<CertificatePrintPage />} />

        {/* Residentes */}
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
        <Route path="/residents/:id/print" element={<ResidentPrintPage />} />

        {/* Medicaciones */}
        <Route
          path="/medication-due"
          element={
            <ProtectedRoute>
              <MedicationDuePage />
            </ProtectedRoute>
          }
        />

        {/* Finanzas (solo OWNER) */}
        <Route
          path="/finance"
          element={
            <ProtectedRoute requireOwner={true}>
              <FinancePage />
            </ProtectedRoute>
          }
        />

        {/* Staff (solo OWNER) */}
        <Route
          path="/staff"
          element={
            <ProtectedRoute requireOwner={true}>
              <StaffManagementPage />
            </ProtectedRoute>
          }
        />

        {/* Asistencia (solo OWNER) */}
        <Route
          path="/attendance"
          element={
            <ProtectedRoute requireOwner={true}>
              <AttendancePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/currently-working"
          element={
            <ProtectedRoute requireOwner={true}>
              <CurrentlyWorkingPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/shifts-management"
          element={
            <ProtectedRoute requireOwner={true}>
              <ShiftsManagementPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/shift-assignments"
          element={
            <ProtectedRoute requireOwner={true}>
              <ShiftAssignmentsPage />
            </ProtectedRoute>
          }
        />

        {/* Historia Clínica */}
        <Route
          path="/clinical-history/search"
          element={
            <ProtectedRoute requireRole="MEDICO">
              <ClinicalHistorySearchPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clinical-history/:patientId"
          element={
            <ProtectedRoute requireRole="MEDICO">
              <ClinicalHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route path="/clinical-history/:patientId/print" element={<ClinicalHistoryPrintPage />} />

        {/* Carpeta Médica */}
        <Route
          path="/medical-folder/search"
          element={
            <ProtectedRoute requireRole="MEDICO">
              <MedicalFolderSearchPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/medical-folder/:patientId"
          element={
            <ProtectedRoute requireRole="MEDICO">
              <MedicalFolderPage />
            </ProtectedRoute>
          }
        />
        <Route path="/medical-folder/:patientId/print" element={<MedicalFolderPrintPage />} />

        {/* Historial de Recetas */}
        <Route
          path="/prescriptions-history/search"
          element={
            <ProtectedRoute requireRole="MEDICO">
              <PrescriptionsHistorySearchPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/prescriptions-history/:patientId"
          element={
            <ProtectedRoute requireRole="MEDICO">
              <PrescriptionsHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route path="/prescriptions-history/:patientId/print" element={<PrescriptionPrintPage />} />

        {/* Actividad */}
        <Route
          path="/activity"
          element={
            <ProtectedRoute>
              <ActivityFeedPage />
            </ProtectedRoute>
          }
        />

        {/* Debug (solo en desarrollo) */}
        {import.meta.env.DEV && <Route path="/debug" element={<DebugPage />} />}

        {/* Home redirect - IMPORTANTE: AL FINAL */}
        <Route path="/" element={<HomeRedirect />} />
        
        {/* Catch-all: redirigir a home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <SessionBootstrap>
            <PWAProvider>
              <FacilityProvider>
                <AppContent />
              </FacilityProvider>
            </PWAProvider>
          </SessionBootstrap>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;