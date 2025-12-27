import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { FacilityProvider } from './contexts/FacilityContext';
import { PWAProvider } from './contexts/PWAContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { UnauthorizedHandler } from './components/auth/UnauthorizedHandler';
import { SessionExpiredHandler } from './components/auth/SessionExpiredHandler';
import { UpdateBanner } from './components/pwa/UpdateBanner';
import { LoginPage } from './pages/LoginPage';
import { SelectFacilityPage } from './pages/SelectFacilityPage';
import { ResidentsListPage } from './pages/ResidentsListPage';
import { ResidentDetailPage } from './pages/ResidentDetailPage';
import { MedicationDuePage } from './pages/MedicationDuePage';
import { FinancePage } from './pages/FinancePage';
import { DebugPage } from './pages/DebugPage';

function App() {
  return (
    <PWAProvider>
      <AuthProvider>
        <FacilityProvider>
          <BrowserRouter>
            <UnauthorizedHandler />
            <SessionExpiredHandler />
            <UpdateBanner />
            <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/select-facility"
              element={
                <ProtectedRoute requireFacility={false}>
                  <SelectFacilityPage />
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
            <Route path="/" element={<Navigate to="/residents" replace />} />
            {import.meta.env.DEV && (
              <Route path="/debug" element={<DebugPage />} />
            )}
            </Routes>
          </BrowserRouter>
        </FacilityProvider>
      </AuthProvider>
    </PWAProvider>
  );
}

export default App;
