import React, { useState, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useStore } from "../store/useStore";
import { supabase } from "../supabaseClient";
import SideMenu from "../Components/SideMenu";
import BottomNav from "../Components/BottomNav";
import SupabaseConfigBanner from "../Components/SupabaseConfigBanner";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Fab,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Alert,
  AlertTitle,
  Container,
  Chip,
  Button,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Add as AddIcon,
  Close as CloseIcon,
  SportsTennis as TennisIcon,
  EmojiEvents as TrophyIcon,
  Groups as GroupsIcon,
} from "@mui/icons-material";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { user, isGuest, setIsGuest, setUser, guestModeStartedAt, setGuestModeStartedAt } = useStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const isDashboard = location.pathname === "/dashboard";
  const guestModeMaxAgeMs = 1000 * 60 * 60 * 24;
  const [now] = useState(() => Date.now());
  const guestModeTimestamp = guestModeStartedAt ? Date.parse(guestModeStartedAt) : Number.NaN;
  // Note for non-coders: we only treat guest mode as active if it started recently.
  const isGuestModeRecent = Number.isFinite(guestModeTimestamp)
    && now - guestModeTimestamp <= guestModeMaxAgeMs;
  const hasGuestAccess = isGuest && isGuestModeRecent;

  useEffect(() => {
    if (isGuest && !isGuestModeRecent) {
      // Note for non-coders: if guest mode is too old, we reset it so the login screen can show again.
      setIsGuest(false);
      setGuestModeStartedAt(null);
    }
  }, [isGuest, isGuestModeRecent, setGuestModeStartedAt, setIsGuest]);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const toggleMenu = useCallback(() => {
    setIsMenuOpen(prev => !prev);
  }, []);

  // Note for non-coders: signing out clears the saved session so the app doesn't auto-log you back in.
  const handleSignOut = useCallback(async () => {
    // Note for non-coders: signing out on the server prevents the app from restoring the session.
    await supabase.auth.signOut();
    setUser(null);
    setIsGuest(false);
    setGuestModeStartedAt(null);
  }, [setGuestModeStartedAt, setIsGuest, setUser]);

  // Note for non-coders: this function receives the click event so we can anchor the menu to the button.
  const handleFabClick: React.MouseEventHandler<HTMLButtonElement> = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleFabClose = () => {
    setAnchorEl(null);
  };

  const handleAuthAction = async () => {
    closeMenu();
    if (hasGuestAccess) {
      setIsGuest(false);
      setGuestModeStartedAt(null);
    } else {
      await handleSignOut();
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', pb: { xs: 8, sm: 0 } }}>
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
        <Container maxWidth="lg" disableGutters>
          <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexGrow: 1 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'linear-gradient(140deg, #b71c1c, #ff8f00)',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: 14,
                  letterSpacing: '0.08em',
                  boxShadow: '0 6px 12px rgba(183, 28, 28, 0.2)',
                }}
              >
                GS
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography
                  variant="h6"
                  component="div"
                  sx={{
                    color: 'primary.main',
                    fontWeight: 800,
                    lineHeight: 1.2,
                    fontSize: { xs: '1.1rem', sm: '1.25rem' }
                  }}
                >
                    {isDashboard ? "Grabbarnas serie" : "Padel-app"}
                </Typography>
                {hasGuestAccess && (
                  <Chip
                    label="Gästläge"
                    size="small"
                    color="warning"
                    sx={{ mt: 0.5, fontWeight: 700, alignSelf: 'flex-start' }}
                  />
                )}
                {isDashboard && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      fontSize: 10,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                    }}
                  >
                      Padel, prestige & ära
                  </Typography>
                )}
              </Box>
            </Box>

            <IconButton
              edge="end"
              color="primary"
              aria-label="meny"
              onClick={toggleMenu}
              sx={{
                display: { xs: 'none', sm: 'inline-flex' },
                ml: 'auto'
              }}
            >
              <MenuIcon />
            </IconButton>
          </Toolbar>
        </Container>
      </AppBar>

      <SideMenu
        isMenuOpen={isMenuOpen}
        closeMenu={closeMenu}
        user={user}
        isGuest={hasGuestAccess}
        handleAuthAction={handleAuthAction}
      />

      <Container maxWidth="lg" sx={{ mt: 2 }}>
        <SupabaseConfigBanner />
      </Container>

      {hasGuestAccess && (
        <Container maxWidth="lg" sx={{ mt: 2 }}>
          <Alert
            severity="warning"
            action={(
              <Button color="primary" variant="contained" size="small" onClick={handleAuthAction}>
                Logga in
              </Button>
            )}
          >
            <AlertTitle>Gästläge</AlertTitle>
            {/* Note for non-coders: this button exits guest mode so the login screen can open. */}
            Utforska statistik, men inga ändringar sparas.
          </Alert>
        </Container>
      )}

      <Box component="main" sx={{ flexGrow: 1 }}>
        {children}
      </Box>

      {/* Floating Action Button for large screens */}
      <Fab
        color="primary"
        aria-label="spela"
        onClick={handleFabClick}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1200,
          display: { xs: 'none', sm: 'flex' },
          width: { sm: 56 },
          height: { sm: 56 }
        }}
      >
        {anchorEl ? <CloseIcon /> : <AddIcon />}
      </Fab>

      {/* Shareable Menu for FAB and BottomNav */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleFabClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        slotProps={{
          paper: {
            sx: {
              mb: 2,
              minWidth: 160,
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
              borderRadius: 3,
            }
          }
        }}
        sx={{ zIndex: 1400 }}
      >
        {!hasGuestAccess && (
          <MenuItem onClick={() => { navigate("/single-game?mode=1v1"); handleFabClose(); }}>
            <ListItemIcon><TennisIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Enkel match 1v1</ListItemText>
          </MenuItem>
        )}
        {!hasGuestAccess && (
          <MenuItem onClick={() => { navigate("/single-game?mode=2v2"); handleFabClose(); }}>
            <ListItemIcon><GroupsIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Enkel match 2v2</ListItemText>
          </MenuItem>
        )}
        {!hasGuestAccess && (
          <MenuItem onClick={() => { navigate("/tournament"); handleFabClose(); }}>
            {/* Note for non-coders: guests don't see the tournament option since they can't create one. */}
            <ListItemIcon><TrophyIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Turnering</ListItemText>
          </MenuItem>
        )}
      </Menu>

      <BottomNav
        isMenuOpen={isMenuOpen}
        isFabOpen={Boolean(anchorEl)}
        toggleMenu={toggleMenu}
        toggleFab={handleFabClick}
        closeMenu={closeMenu}
        isGuest={hasGuestAccess}
      />
    </Box>
  );
}
