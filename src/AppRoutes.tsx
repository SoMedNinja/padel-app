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
import { useStore } from "./store/useStore";
import { motion, AnimatePresence } from "framer-motion";

const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, x: 10 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -10 }}
    transition={{ duration: 0.2, ease: "easeOut" }}
  >
    {children}
  </motion.div>
);

export default function AppRoutes() {
  const { user, isGuest } = useStore();
  const location = useLocation();
  const isAdmin = user?.is_admin;
  const canAccessSchedule = Boolean(user?.is_regular);

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageWrapper><PlayerProfilePage /></PageWrapper>} />
        <Route path="/dashboard" element={<PageWrapper><Dashboard /></PageWrapper>} />
        <Route path="/grabbarnas-serie" element={<Navigate to="/dashboard" replace />} />
        <Route path="/history" element={<PageWrapper><HistoryPage /></PageWrapper>} />
        {canAccessSchedule && <Route path="/schedule" element={<PageWrapper><SchedulePage /></PageWrapper>} />}
        {canAccessSchedule && <Route path="/schema" element={<Navigate to="/schedule" replace />} />}
        {!isGuest && <Route path="/tournament" element={<PageWrapper><TournamentPage /></PageWrapper>} />}
        <Route path="/profile" element={<Navigate to="/" replace />} />
        <Route path="/mexicana" element={<Navigate to="/tournament" replace />} />
        {!isGuest && <Route path="/single-game" element={<PageWrapper><SingleGamePage /></PageWrapper>} />}
        <Route path="/match/:matchId" element={<PageWrapper><MatchShareRedirectPage /></PageWrapper>} />
        <Route path="/offline" element={<PageWrapper><OfflinePage /></PageWrapper>} />
        {isAdmin && <Route path="/admin" element={<PageWrapper><AdminPage /></PageWrapper>} />}
        {isAdmin && <Route path="/admin/email" element={<PageWrapper><AdminPage /></PageWrapper>} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}
