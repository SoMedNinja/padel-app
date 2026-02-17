import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import HistoryPage from "./pages/HistoryPage";
import AdminPage from "./pages/AdminPage";
import TournamentPage from "./pages/TournamentPage";
import SingleGamePage from "./pages/SingleGamePage";
import PlayerProfilePage from "./pages/PlayerProfilePage";
import SchedulePage from "./pages/SchedulePage";
import MatchShareRedirectPage from "./pages/MatchShareRedirectPage";
import OfflinePage from "./pages/OfflinePage";
import EducationPage from "./pages/EducationPage";
import PuzzlesPage from "./pages/PuzzlesPage";
import { useStore } from "./store/useStore";
import { AnimatePresence } from "framer-motion";
import PageTransition from "./Components/Shared/PageTransition";

export default function AppRoutes() {
  const { user, isGuest } = useStore();
  const location = useLocation();
  const isAdmin = user?.is_admin;
  const canAccessSchedule = Boolean(user?.is_regular);

  return (
    <AnimatePresence>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><PlayerProfilePage /></PageTransition>} />
        <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
        <Route path="/grabbarnas-serie" element={<Navigate to="/dashboard" replace />} />
        <Route path="/history" element={<PageTransition><HistoryPage /></PageTransition>} />
        <Route path="/education" element={<PageTransition><EducationPage /></PageTransition>} />
        <Route path="/education/:topicId" element={<PageTransition><EducationPage /></PageTransition>} />
        <Route path="/puzzles" element={<PageTransition><PuzzlesPage /></PageTransition>} />
        {canAccessSchedule && <Route path="/schedule" element={<PageTransition><SchedulePage /></PageTransition>} />}
        {canAccessSchedule && <Route path="/schema" element={<Navigate to="/schedule" replace />} />}
        {!isGuest && <Route path="/tournament" element={<PageTransition><TournamentPage /></PageTransition>} />}
        <Route path="/profile" element={<Navigate to="/" replace />} />
        <Route path="/mexicana" element={<Navigate to="/tournament" replace />} />
        {!isGuest && <Route path="/single-game" element={<PageTransition><SingleGamePage /></PageTransition>} />}
        <Route path="/match/:matchId" element={<PageTransition><MatchShareRedirectPage /></PageTransition>} />
        <Route path="/offline" element={<PageTransition><OfflinePage /></PageTransition>} />
        {isAdmin && <Route path="/admin" element={<PageTransition><AdminPage /></PageTransition>} />}
        {isAdmin && <Route path="/admin/email" element={<PageTransition><AdminPage /></PageTransition>} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}
