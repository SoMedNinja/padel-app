import React from "react";
import { useNavigate } from "react-router-dom";
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
  AdminPanelSettings as AdminIcon,
  Logout as LogoutIcon,
  Login as LoginIcon,
} from "@mui/icons-material";

interface SideMenuProps {
  isMenuOpen: boolean;
  closeMenu: () => void;
  user: any;
  isGuest: boolean;
  handleAuthAction: () => void;
}

export default function SideMenu({ isMenuOpen, closeMenu, user, isGuest, handleAuthAction }: SideMenuProps) {
  const navigate = useNavigate();

  const menuItems = [
    // Note for non-coders: this is the menu text users see for the "/" profile page.
    { text: "Profil", icon: <HomeIcon />, path: "/" },
    { text: "Grabbarnas serie", icon: <TrophyIcon />, path: "/dashboard" },
    { text: "Matchhistorik", icon: <HistoryIcon />, path: "/history" },
  ];

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
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton onClick={() => handleNavigate(item.path)}>
                <ListItemIcon sx={{ color: 'primary.main' }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: 600 }} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        <Divider sx={{ my: 1 }} />
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
