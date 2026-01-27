import { Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import HistoryPage from "./pages/HistoryPage";
import AdminPage from "./pages/AdminPage";
import TournamentPage from "./pages/TournamentPage";
import SingleGamePage from "./pages/SingleGamePage";
import PlayerProfilePage from "./pages/PlayerProfilePage";
import { useStore } from "./store/useStore";

export default function AppRoutes() {
  const { user, isGuest } = useStore();
  const isAdmin = user?.is_admin;

  return (
    <Routes>
      <Route path="/" element={<PlayerProfilePage />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/grabbarnas-serie" element={<Navigate to="/dashboard" replace />} />
      <Route path="/history" element={<HistoryPage />} />
      {!isGuest && <Route path="/tournament" element={<TournamentPage />} />}
      <Route path="/profile" element={<Navigate to="/" replace />} />
      <Route path="/mexicana" element={<Navigate to="/tournament" replace />} />
      {!isGuest && <Route path="/single-game" element={<SingleGamePage />} />}
      {isAdmin && <Route path="/admin" element={<AdminPage />} />}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
