import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Box,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  ShowChart as AssessmentIcon,
  AccountCircle as PersonIcon,
  LibraryAdd as MatchIcon,
  CalendarMonth as CalendarIcon,
  MoreHoriz as MoreIcon,
  Lock as LockIcon,
} from "@mui/icons-material";

interface BottomNavProps {
  isMenuOpen: boolean;
  toggleMenu: () => void;
  closeMenu: () => void;
  isGuest?: boolean;
  canSeeSchedule?: boolean;
  canUseSingleGame?: boolean;
}

const BottomNav: React.FC<BottomNavProps> = ({
  isMenuOpen,
  toggleMenu,
  closeMenu,
  isGuest = false,
  canSeeSchedule = false,
  canUseSingleGame = true,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveValue = () => {
    if (isMenuOpen) return 'more';
    if (location.pathname === '/dashboard') return 'dashboard';
    if (location.pathname === '/') return 'profile';
    if (location.pathname === '/single-game') return 'match';
    if (location.pathname === '/schedule') return 'schedule';
    return null;
  };

  const handleChange = (_event: React.SyntheticEvent, newValue: string) => {
    if (newValue === 'more') {
      toggleMenu();
    } else {
      closeMenu();
      if (newValue === 'dashboard') navigate('/dashboard');
      if (newValue === 'profile') navigate('/');
      if (newValue === 'match') navigate('/single-game');
      if (newValue === 'schedule') navigate('/schedule');
    }
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
        borderColor: 'divider',
        // Support for iPhones with home indicator
        pb: 'env(safe-area-inset-bottom, 0px)',
        // Note for non-coders: this matches the "Liquid Glass" blur effect from the top header and iOS native UI.
        bgcolor: (theme) => alpha(theme.palette.background.paper, 0.72),
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      }}
      elevation={0}
    >
      <BottomNavigation
        showLabels
        value={getActiveValue()}
        onChange={handleChange}
        sx={{
          height: 72, // Increased from 64
          bgcolor: 'transparent',
          '& .MuiBottomNavigationAction-root': {
            minWidth: 0,
            padding: '8px 0',
          },
          '& .MuiBottomNavigationAction-label': {
            fontWeight: 700,
            fontSize: '0.65rem',
            '&.Mui-selected': {
              fontSize: '0.65rem',
            }
          }
        }}
      >
        <BottomNavigationAction
          label="Översikt"
          value="dashboard"
          icon={<AssessmentIcon />}
        />
        <BottomNavigationAction
          label="Profil"
          value="profile"
          icon={<PersonIcon />}
        />
        {canUseSingleGame && (
          <BottomNavigationAction
            label="Match"
            value="match"
            icon={
              isGuest ? (
                <LockIcon />
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 48, // Increased from 40
                    height: 48, // Increased from 40
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    color: 'white',
                    mb: 0.5,
                    boxShadow: (theme) => `0 4px 12px ${alpha(theme.palette.primary.main, 0.4)}`,
                    transition: 'transform 0.2s',
                    '&:active': {
                      transform: 'scale(0.92)',
                    }
                  }}
                >
                  <MatchIcon sx={{ fontSize: '1.8rem' }} />
                </Box>
              )
            }
            disabled={isGuest}
          />
        )}
        {canSeeSchedule && (
          <BottomNavigationAction
            label="Schema"
            value="schedule"
            icon={<CalendarIcon />}
          />
        )}
        <BottomNavigationAction
          label="Mer"
          value="more"
          icon={<MoreIcon />}
        />
      </BottomNavigation>
    </Paper>
  );
};

export default BottomNav;
