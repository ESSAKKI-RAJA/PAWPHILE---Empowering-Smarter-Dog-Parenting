import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PawphileDataProvider } from './context/PawphileDataContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/layout/Layout';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import DogHealthTriage from './pages/DogHealthTriage';
import EmergencyClassifier from './pages/EmergencyClassifier';

import VetVisitSummary from './pages/VetVisitSummary';
import Nutrition from './pages/Nutrition';
import Behavior from './pages/Behavior';
import VetLocator from './pages/VetFinder';
import FoodSafety from './pages/FoodSafety';
import VisionScan from './pages/VisionScan';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import Auth from './pages/Auth';
import BMICalculator from './pages/BMICalculator';

import ConsentCenter from './pages/ConsentCenter';
import DataExport from './pages/DataExport';
import PawAiCenter from './pages/PawAiCenter';
import PreventiveCare from './pages/PreventiveCare';
import PawNewsPage from './pages/PawNews';
import AdminNews from './pages/admin/AdminNews';
import SyncManager from './services/SyncManager';

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <PawphileDataProvider>
          <SyncManager />
          <BrowserRouter>
            <Routes>
              {/* Auth page — public */}
              <Route path="/auth" element={<Auth />} />

              {/* Protected Routes */}
              <Route 
                path="*" 
                element={
                  <Layout />
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="triage" element={<DogHealthTriage />} />
                <Route path="emergency" element={<EmergencyClassifier />} />
                {/* Preventive Care — consolidated page */}
                <Route path="preventive-care" element={<PreventiveCare />} />
                {/* Backward compat: old direct routes still work */}
                <Route path="vaccines" element={<Navigate to="/preventive-care" replace />} />
                <Route path="deworming" element={<Navigate to="/preventive-care" replace />} />
                <Route path="symptoms" element={<Navigate to="/triage" replace />} />
                <Route path="paw-ai" element={<PawAiCenter />} />
                <Route path="vet-summary" element={<VetVisitSummary />} />
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
        </PawphileDataProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
