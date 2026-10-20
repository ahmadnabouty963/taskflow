import { Route, Routes } from "react-router";
import { ProtectedRoute } from "./components/ProtectedRoute.jsx";
import { ThemeToggle } from "./components/ThemeToggle.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { LandingPage } from "./pages/LandingPage.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { NotFoundPage } from "./pages/NotFoundPage.jsx";
import { RegisterPage } from "./pages/RegisterPage.jsx";
import { ProjectPage } from "./pages/ProjectPage.jsx";
import { ImpressumPage } from "./pages/ImpressumPage.jsx";
import { PrivacyPage } from "./pages/PrivacyPage.jsx";
import { SettingsPage } from "./pages/SettingsPage.jsx";
import { PlanningPage } from "./pages/PlanningPage.jsx";
import { CalendarPage } from "./pages/CalendarPage.jsx";
import { WorkspaceSettingsPage } from "./pages/WorkspaceSettingsPage.jsx";
import { InvitationPage } from "./pages/InvitationPage.jsx";
import { PageTitle } from "./components/PageTitle.jsx";
import "./App.css";

function App() {
  return (
    <>
      <PageTitle />
      <ThemeToggle />
      <Routes>
        <Route index element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/invite/:token" element={<InvitationPage />} />
        <Route path="/impressum" element={<ImpressumPage />} />
        <Route path="/datenschutz" element={<PrivacyPage />} />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/today"
          element={
            <ProtectedRoute>
              <PlanningPage mode="today" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/upcoming"
          element={
            <ProtectedRoute>
              <PlanningPage mode="upcoming" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/calendar"
          element={
            <ProtectedRoute>
              <CalendarPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/workspaces/:workspaceId/settings"
          element={
            <ProtectedRoute>
              <WorkspaceSettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/projects/:projectId"
          element={
            <ProtectedRoute>
              <ProjectPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}

export default App;
