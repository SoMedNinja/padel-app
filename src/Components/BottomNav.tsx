import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  BottomNavigation,
  BottomNavigationAction,
  Paper,
} from "@mui/material";
import {
  Person as PersonIcon,
  Add as AddIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  Lock as LockIcon,
} from "@mui/icons-material";

// Note for non-coders: this type says the button click sends us a "mouse click" event object.
type FabToggleHandler = React.MouseEventHandler<HTMLButtonElement>;

interface BottomNavProps {
  isMenuOpen: boolean;
  isFabOpen: boolean;
  toggleMenu: () => void;
  toggleFab: FabToggleHandler;
  closeMenu: () => void;
  isGuest?: boolean;
}

const BottomNav: React.FC<BottomNavProps> = ({
  isMenuOpen,
  isFabOpen,
  toggleMenu,
  toggleFab,
  closeMenu,
  isGuest = false
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Note for non-coders: these helpers run when you tap a tab, so each button
  // always reacts even if it was already selected before.
  const handleHomeClick = () => {
    closeMenu();
    navigate('/');
  };

  const handleMenuClick = () => {
    toggleMenu();
  };

  const getActiveValue = () => {
    if (isMenuOpen) return 'menu';
    if (location.pathname === '/') return 'home';
    return null;
  };

  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: { xs: 'block', sm: 'none' },
        zIndex: 1100,
        borderTop: 1,
        borderColor: 'divider'
      }}
      elevation={3}
    >
      <BottomNavigation
        showLabels
        value={getActiveValue()}
      >
        <BottomNavigationAction
          // Note for non-coders: this label is just the visible text for the "/" (profile) tab.
          label="Profil"
          value="home"
          icon={<PersonIcon />}
          onClick={handleHomeClick}
        />
        <BottomNavigationAction
          label={isGuest ? "Spela (logga in)" : "Spela"}
          value="fab"
          icon={
            isGuest
              ? <LockIcon sx={{ fontSize: '2rem' }} />
              : isFabOpen
                ? <CloseIcon sx={{ fontSize: '2rem' }} />
                : <AddIcon sx={{ fontSize: '2rem' }} />
          }
          onClick={isGuest ? undefined : toggleFab}
          disabled={isGuest}
          sx={{
            '& .MuiBottomNavigationAction-label': {
              color: 'primary.main',
              fontWeight: 800
            },
            '& .MuiSvgIcon-root': {
              color: 'primary.main',
            }
          }}
        />
        <BottomNavigationAction
          label="Meny"
          value="menu"
          icon={isMenuOpen ? <CloseIcon /> : <MenuIcon />}
          onClick={handleMenuClick}
        />
      </BottomNavigation>
    </Paper>
  );
};

export default BottomNav;
