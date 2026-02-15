import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Button,
  Chip,
} from "@mui/material";
import {
  Home as HomeIcon,
  EmojiEvents as TrophyIcon,
  History as HistoryIcon,
  CalendarMonth as CalendarIcon,
  AdminPanelSettings as AdminIcon,
  Logout as LogoutIcon,
  Login as LoginIcon,
  School as SchoolIcon,
  Extension as ExtensionIcon,
} from "@mui/icons-material";

interface SideMenuProps {
  isMenuOpen: boolean;
  closeMenu: () => void;
  user: any;
  isGuest: boolean;
  handleAuthAction: () => void;
  onOpenPermissionGuide: () => void;
}

export default function SideMenu({ isMenuOpen, closeMenu, user, isGuest, handleAuthAction, onOpenPermissionGuide }: SideMenuProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    // Note for non-coders: this is the menu text users see for the "/" profile page.
    { text: "Profil", icon: <HomeIcon />, path: "/" },
    { text: "Översikt", icon: <TrophyIcon />, path: "/dashboard" },
    { text: "Matchhistorik", icon: <HistoryIcon />, path: "/history" },
    { text: "Utbildning", icon: <SchoolIcon />, path: "/education" },
    { text: "Puzzles", icon: <ExtensionIcon />, path: "/puzzles" },
  ];

  if (user?.is_regular) {
    // Note for non-coders: only regular players (ordinarie) can access the weekly Schema module.
    menuItems.push({ text: "Schema", icon: <CalendarIcon />, path: "/schema" });
  }

  if (user?.is_admin) {
    menuItems.push({ text: "Admin", icon: <AdminIcon />, path: "/admin" });
  }

  const handleNavigate = (path: string) => {
    navigate(path);
    closeMenu();
  };

  return (
    <Drawer
      anchor="right"
      open={isMenuOpen}
      onClose={closeMenu}
      PaperProps={{
        sx: { width: 280 }
      }}
    >
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {isGuest && (
          <Chip
            label="Gästläge"
            color="warning"
            size="small"
            sx={{ alignSelf: 'flex-start', fontWeight: 700, mb: 1 }}
          />
        )}
        <List>
          {menuItems.map((item) => {
            // Note for non-coders: we check if the current URL matches the menu item's path to highlight it.
            const isActive = location.pathname === item.path;

            return (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  onClick={() => handleNavigate(item.path)}
                  selected={isActive}
                  sx={isActive ? { bgcolor: "action.selected" } : undefined}
                >
                  <ListItemIcon sx={{ color: 'primary.main' }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: 600 }} />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
        <Divider sx={{ my: 1 }} />
        <List>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => {
                onOpenPermissionGuide();
                closeMenu();
              }}
            >
              <ListItemText primary="Behörighetshjälp" primaryTypographyProps={{ fontWeight: 600 }} />
            </ListItemButton>
          </ListItem>
        </List>
        <Box sx={{ mt: 'auto', p: 1 }}>
          <Button
            fullWidth
            variant="outlined"
            color={isGuest ? "primary" : "inherit"}
            startIcon={isGuest ? <LoginIcon /> : <LogoutIcon />}
            onClick={handleAuthAction}
            sx={{ borderRadius: 2 }}
          >
            {isGuest ? "Logga in / Skapa konto" : "Logga ut"}
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}
