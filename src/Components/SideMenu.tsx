import React from "react";
import { Link } from "react-router-dom";

interface SideMenuProps {
  isMenuOpen: boolean;
  closeMenu: () => void;
  user: any;
  isGuest: boolean;
  handleAuthAction: () => void;
}

const SideMenu = React.forwardRef<HTMLElement, SideMenuProps>(
  ({ isMenuOpen, closeMenu, user, isGuest, handleAuthAction }, ref) => {
    return (
      <nav
        id="app-menu"
        ref={ref}
        className={`app-menu ${isMenuOpen ? "open" : ""}`}
        aria-label="Huvudmeny"
      >
        <Link to="/" onClick={closeMenu}>Hem</Link>
        <Link to="/profile" onClick={closeMenu}>Spelarprofil</Link>
        <Link to="/history" onClick={closeMenu}>Match-historik</Link>
        {user?.is_admin && <Link to="/admin" onClick={closeMenu}>Admin</Link>}
        <button type="button" className="ghost-button" onClick={handleAuthAction}>
          {isGuest ? "Logga in / skapa konto" : "Logga ut"}
        </button>
      </nav>
    );
  }
);

SideMenu.displayName = "SideMenu";

export default SideMenu;
