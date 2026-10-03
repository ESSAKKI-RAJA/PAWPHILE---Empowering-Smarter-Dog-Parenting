import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PawphileDataProvider } from './context/PawphileDataContext';
import { PersonalizationProvider } from './context/PersonalizationContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/layout/Layout';
import RequireAuth from './components/layout/RequireAuth';
import ErrorBoundary from './components/layout/ErrorBoundary';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import DogHealthTriage from './pages/DogHealthTriage';
import EmergencyClassifier from './pages/EmergencyClassifier';

import VetRecords from './pages/VetRecords';
import Nutrition from './pages/Nutrition';
import Behavior from './pages/Behavior';
import VetLocator from './pages/VetFinder';
import FoodSafety from './pages/FoodSafety';
import VisionScan from './pages/VisionScan';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import Auth from './pages/Auth';
import BMICalculator from './pages/BMICalculator';

import Timeline from './pages/Timeline';
import CarePlan from './pages/CarePlan';
import Welcome from './pages/Welcome';
import ShareView from './pages/ShareView';
import VeterinaryCare from './pages/VeterinaryCare';
import VetPortal from './pages/VetPortal';
import Connections from './pages/Connections';
import Organizations from './pages/Organizations';
import HealthIntelligence from './pages/HealthIntelligence';
import ConsentCenter from './pages/ConsentCenter';
import DataExport from './pages/DataExport';
import PawAiCenter from './pages/PawAiCenter';
import PreventiveCare from './pages/PreventiveCare';
import PawNewsPage from './pages/PawNews';
import AdminNews from './pages/admin/AdminNews';
import SyncManager from './services/SyncManager';

export default function App() {
  // Build-time constant: when no Clerk key is configured the app runs
  // without the auth gate, exactly matching the previous behavior.
  const HAS_CLERK = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  return (
    <ThemeProvider>
      <ToastProvider>
        <PawphileDataProvider>
          <SyncManager />
        <PersonalizationProvider>
          <BrowserRouter>
            <Routes>
              {/* Auth page — public */}
              <Route path="/auth" element={<Auth />} />

              {/* Front page — public product story, own navigation.
                  Root alias: production entry point renders Welcome. */}
              <Route path="/" element={<Welcome />} />
              <Route path="/welcome" element={<Welcome />} />

              {/* Protected Routes — RequireAuth sends logged-out visits to /auth */}
              <Route
                path="*"
                element={
                  <ErrorBoundary>
                    {HAS_CLERK ? (
                      <RequireAuth>
                        <Layout />
                      </RequireAuth>
                    ) : (
                      <Layout />
                    )}
                  </ErrorBoundary>
                }
              >
                {/* NOTE: no index route here. The splat parent's index used to
                    outrank the explicit "/" route and bounce the root into the
                    app shell. "/" and "/welcome" are declared above; unknown
                    paths fall through to the inner "*" redirect below. */}
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="timeline" element={<Timeline />} />
                <Route path="care-plan" element={<CarePlan />} />
                <Route path="share" element={<ShareView />} />
                <Route path="veterinary" element={<VeterinaryCare />} />
                <Route path="vet" element={<VetPortal />} />
                <Route path="connections" element={<Connections />} />
                <Route path="organizations" element={<Organizations />} />
                <Route path="intelligence" element={<HealthIntelligence />} />
                <Route path="triage" element={<DogHealthTriage />} />
                <Route path="emergency" element={<EmergencyClassifier />} />
                {/* Preventive Care — consolidated page */}
                <Route path="preventive-care" element={<PreventiveCare />} />
                {/* Backward compat: old direct routes still work */}
                <Route path="vaccines" element={<Navigate to="/preventive-care" replace />} />
                <Route path="deworming" element={<Navigate to="/preventive-care" replace />} />
                <Route path="symptoms" element={<Navigate to="/triage" replace />} />
                <Route path="paw-ai" element={<PawAiCenter />} />
                <Route path="vet-records" element={<VetRecords />} />
                <Route path="vet-summary" element={<Navigate to="/vet-records" replace />} />
                <Route path="nutrition" element={<Nutrition />} />
                <Route path="behavior" element={<Behavior />} />
                <Route path="vet-locator" element={<VetLocator />} />
                <Route path="food-safety" element={<FoodSafety />} />
                <Route path="vets" element={<VetLocator />} />
                <Route path="vision" element={<VisionScan />} />
                <Route path="pawnews" element={<PawNewsPage />} />
                <Route path="admin/news" element={<AdminNews />} />
                <Route path="profile" element={<Profile isNew={false} />} />
                <Route path="settings" element={<Settings />} />
                <Route path="reports" element={<Reports />} />
                <Route path="bmi" element={<BMICalculator />} />
                <Route path="reminders" element={<Navigate to="/preventive-care" replace />} />
                <Route path="consent" element={<ConsentCenter />} />
                <Route path="export" element={<DataExport />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </PersonalizationProvider>
        </PawphileDataProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
