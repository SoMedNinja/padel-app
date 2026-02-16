import React, { useState, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useStore } from "../store/useStore";
import { supabase } from "../supabaseClient";
import { alpha } from "@mui/material/styles";
import SideMenu from "../Components/SideMenu";
import BottomNav from "../Components/BottomNav";
import SupabaseConfigBanner from "../Components/SupabaseConfigBanner";
import InstallPrompt from "../Components/InstallPrompt";
import PostInstallChecklist from "../Components/PostInstallChecklist";
import MatchSyncStatusBanner from "../Components/Shared/MatchSyncStatusBanner";
import AppVersionPolicyBanner from "../Components/AppVersionPolicyBanner";
import PermissionActionGuide from "../Components/Permissions/PermissionActionGuide";
import { requestOpenPermissionGuide } from "../services/permissionGuidanceService";
import { detectStandaloneInstallState } from "../services/webNotificationService";
import {
  IconButton,
  Box,
  Fab,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItem,
  ListItemText,
  List,
  ListItem,
  Alert,
  AlertTitle,
  Container,
  Button,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  Menu as MenuIcon,
  Add as AddIcon,
  Close as CloseIcon,
  MoreVert as MoreVertIcon,
  SportsTennis as TennisIcon,
  EmojiEvents as TrophyIcon,
  Groups as GroupsIcon,
  Logout as LogoutIcon,
  Refresh as RefreshIcon,
  HelpOutline as HelpIcon,
} from "@mui/icons-material";
import AppBottomSheet from "../Components/Shared/AppBottomSheet";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { user, isGuest, setIsGuest, setUser, guestModeStartedAt, setGuestModeStartedAt } = useStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [overflowAnchorEl, setOverflowAnchorEl] = useState<null | HTMLElement>(null);
  const [isStandaloneApp, setIsStandaloneApp] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === "/dashboard") return "Översikt";
    if (path === "/") return "Profil";
    if (path === "/history") return "Historik";
    if (path === "/schedule") return "Schema";
    if (path === "/tournament") return "Turnering";
    if (path === "/single-game") return "Match";
    if (path === "/admin") return "Admin";
    if (path === "/puzzles") return "Pussel";
    if (path === "/education") return "Utbildning";
    if (path.startsWith("/match/")) return "Matchdetaljer";
    return "Padel Native";
  };

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

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Note for non-coders: this checks whether the app is opened in installed-app mode instead of a normal browser tab.
    const syncStandaloneState = () => {
      setIsStandaloneApp(detectStandaloneInstallState());
    };

    syncStandaloneState();
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleModeChange = () => syncStandaloneState();
    mediaQuery.addEventListener("change", handleModeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleModeChange);
    };
  }, []);

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

  // Note for non-coders: this opens the small "more options" menu (⋮).
  const handleOverflowOpen: React.MouseEventHandler<HTMLButtonElement> = (event) => {
    setOverflowAnchorEl(event.currentTarget);
  };

  // Note for non-coders: closing the menu hides it but keeps the rest of the screen as-is.
  const handleOverflowClose = () => {
    setOverflowAnchorEl(null);
  };

  const handleReloadApp = () => {
    // Note for non-coders: this is the same as refreshing the browser tab.
    window.location.reload();
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
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        // Note for non-coders: 100vh works everywhere, and 100dvh improves phone/PWA behavior when browser bars appear or hide.
        minHeight: '100vh',
        '@supports (height: 100dvh)': {
          minHeight: '100dvh',
        },
        pb: { xs: 8, sm: 0 },
      }}
    >
      {/* Note for non-coders: desktop keeps this normal top row, but on phones we use a floating button to avoid reserving extra vertical space. */}
      <Container
        maxWidth="lg"
        sx={{
          pt: 1,
          display: { xs: "none", sm: "flex" },
          justifyContent: "flex-end",
          gap: 1,
        }}
      >
        <IconButton
          edge="end"
          color="primary"
          aria-label="meny"
          onClick={toggleMenu}
          sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
        >
          <MenuIcon />
        </IconButton>
        <IconButton
          edge="end"
          color="primary"
          aria-label="fler alternativ"
          onClick={handleOverflowOpen}
        >
          <MoreVertIcon />
        </IconButton>
      </Container>

      {/* Note for non-coders: this sticky header provides the "Liquid Glass" (blur) effect
          matching the native iOS navigation bar. */}
      <Box
        component="header"
        sx={{
          position: 'sticky',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
          bgcolor: (theme) => alpha(theme.palette.background.default, 0.72),
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: '1px solid',
          borderColor: 'divider',
          height: 'calc(env(safe-area-inset-top, 0px) + 56px)',
          display: { xs: 'flex', sm: 'none' },
          alignItems: 'center',
          px: 2,
          pt: 'env(safe-area-inset-top, 0px)',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 800, flexGrow: 1, textAlign: 'center', ml: 6 }}>
          {getPageTitle()}
        </Typography>
        <IconButton
          color="primary"
          aria-label="fler alternativ"
          onClick={handleOverflowOpen}
        >
          <MoreVertIcon />
        </IconButton>
      </Box>

      <SideMenu
        isMenuOpen={isMenuOpen}
        closeMenu={closeMenu}
        user={user}
        isGuest={hasGuestAccess}
        handleAuthAction={handleAuthAction}
        onOpenPermissionGuide={() => requestOpenPermissionGuide("menu")}
      />

      <Container
        maxWidth="lg"
        sx={{
          mt: 2,
          // Note for non-coders: only visible banners become real DOM elements,
          // so this selector adds spacing only between banners that actually show.
          '& > * + *': { mt: 2 },
        }}
      >
        <SupabaseConfigBanner />
        {/* Note for non-coders: this banner distinguishes "must update now" from "good to update soon" using server policy rules. */}
        <AppVersionPolicyBanner />
        {/* Note for non-coders: this card helps people install the web app like a normal phone app. */}
        <InstallPrompt />
        <MatchSyncStatusBanner />
        {hasGuestAccess && (
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
        )}
      </Container>

      {isStandaloneApp && (
        <PostInstallChecklist
          isStandalone={isStandaloneApp}
          // Note for non-coders: guests can browse, but this step only completes when a real account session exists.
          isSignedIn={Boolean(user) && !hasGuestAccess}
        />
      )}

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          // Note for non-coders: this adds a small breathing space below the top controls
          // so page content does not feel glued to the very top edge.
          pt: { xs: 1, sm: 1.5 },
        }}
      >
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

      {/* Overflow options for desktop/large screens */}
      <Menu
        anchorEl={overflowAnchorEl}
        open={Boolean(overflowAnchorEl) && !isStandaloneApp}
        onClose={handleOverflowClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        slotProps={{
          paper: {
            sx: {
              minWidth: 180,
              borderRadius: 2,
              display: { xs: 'none', sm: 'block' }
            }
          }
        }}
      >
        <MenuItem
          onClick={() => {
            handleOverflowClose();
            handleReloadApp();
          }}
        >
          <ListItemIcon><RefreshIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Ladda om appen</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleOverflowClose();
            requestOpenPermissionGuide("menu");
          }}
        >
          <ListItemIcon><HelpIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Behörighetshjälp</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleOverflowClose();
            void handleAuthAction();
          }}
        >
          <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Logga ut</ListItemText>
        </MenuItem>
      </Menu>

      {/* Overflow options for mobile (Native-style Bottom Sheet) */}
      {isMobile && (
        <AppBottomSheet
          open={Boolean(overflowAnchorEl)}
          onClose={handleOverflowClose}
          title="Alternativ"
        >
        <List disablePadding>
          <ListItem disableGutters>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => {
                handleOverflowClose();
                handleReloadApp();
              }}
              sx={{ justifyContent: 'flex-start', py: 1.5 }}
            >
              Ladda om appen
            </Button>
          </ListItem>
          <ListItem disableGutters>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<HelpIcon />}
              onClick={() => {
                handleOverflowClose();
                requestOpenPermissionGuide("menu");
              }}
              sx={{ justifyContent: 'flex-start', py: 1.5 }}
            >
              Behörighetshjälp
            </Button>
          </ListItem>
          <ListItem disableGutters>
            <Button
              fullWidth
              variant="contained"
              color="error"
              startIcon={<LogoutIcon />}
              onClick={() => {
                handleOverflowClose();
                void handleAuthAction();
              }}
              sx={{ justifyContent: 'flex-start', py: 1.5, mt: 1 }}
            >
              Logga ut
            </Button>
          </ListItem>
          </List>
        </AppBottomSheet>
      )}

      <BottomNav
        isMenuOpen={isMenuOpen}
        toggleMenu={toggleMenu}
        closeMenu={closeMenu}
        isGuest={hasGuestAccess}
        canSeeSchedule={Boolean(user?.is_regular)}
        canUseSingleGame={!hasGuestAccess}
      />

      <PermissionActionGuide />
    </Box>
  );
}
