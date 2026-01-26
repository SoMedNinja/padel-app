import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  BottomNavigation,
  BottomNavigationAction,
  Paper,
} from "@mui/material";
import {
  Home as HomeIcon,
  Add as AddIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
} from "@mui/icons-material";

interface BottomNavProps {
  isMenuOpen: boolean;
  isFabOpen: boolean;
  toggleMenu: () => void;
  toggleFab: (event: React.MouseEvent<HTMLButtonElement>) => void;
  closeMenu: () => void;
}

const BottomNav: React.FC<BottomNavProps> = ({
  isMenuOpen,
  isFabOpen,
  toggleMenu,
  toggleFab,
  closeMenu
}) => {
  const navigate = useNavigate();
  const location = useLocation();

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
        onChange={(_, newValue) => {
          if (newValue === 'home') {
            closeMenu();
            navigate('/');
          } else if (newValue === 'menu') {
            toggleMenu();
          }
        }}
      >
        <BottomNavigationAction
          label="Hem"
          value="home"
          icon={<HomeIcon />}
        />
        <BottomNavigationAction
          label="Spela"
          value="fab"
          icon={isFabOpen ? <CloseIcon /> : <AddIcon />}
          onClick={toggleFab}
          sx={{
            '& .MuiBottomNavigationAction-label': {
              color: 'primary.main',
              fontWeight: 800
            },
            '& .MuiSvgIcon-root': {
              color: 'primary.main',
              fontSize: '2rem'
            }
          }}
        />
        <BottomNavigationAction
          label="Meny"
          value="menu"
          icon={<MenuIcon />}
        />
      </BottomNavigation>
    </Paper>
  );
};

export default BottomNav;
