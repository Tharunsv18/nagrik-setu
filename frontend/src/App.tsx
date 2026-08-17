import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { AboutPage } from "@/pages/AboutPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { DiscoverPage } from "@/pages/DiscoverPage";
import { GrievanceDetailPage } from "@/pages/GrievanceDetailPage";
import { GrievancesPage, NewGrievancePage } from "@/pages/GrievancesPage";
import { LandingPage } from "@/pages/LandingPage";
import { SchemeDetailPage } from "@/pages/SchemeDetailPage";
import { SchemesPage } from "@/pages/SchemesPage";
import { SignInPage } from "@/pages/SignInPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { ServicesPage } from "@/pages/ServicesPage";

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<LandingPage />} />
        <Route path="signin" element={<SignInPage />} />
        <Route path="discover" element={<DiscoverPage />} />
        <Route path="schemes" element={<SchemesPage />} />
        <Route path="schemes/:id" element={<SchemeDetailPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="grievances" element={<GrievancesPage />} />
        <Route path="grievances/new" element={<NewGrievancePage />} />
        <Route path="grievances/:id" element={<GrievanceDetailPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
