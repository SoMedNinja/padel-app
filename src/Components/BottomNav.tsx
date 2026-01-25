import React from "react";
import { Link } from "react-router-dom";

interface BottomNavProps {
  isMenuOpen: boolean;
  isFabOpen: boolean;
  toggleMenu: () => void;
  toggleFab: () => void;
  closeMenu: () => void;
}

const BottomNav: React.FC<BottomNavProps> = ({
  isMenuOpen,
  isFabOpen,
  toggleMenu,
  toggleFab,
  closeMenu
}) => {
  return (
    <nav className="bottom-nav" aria-label="Bottenmeny">
      <Link to="/" className="bottom-nav-item" onClick={closeMenu}>
        <span className="bottom-nav-icon">🏠</span>
        <span className="bottom-nav-label">Hem</span>
      </Link>
      <button
        type="button"
        className={`bottom-nav-item primary ${isFabOpen ? 'active' : ''}`}
        onClick={toggleFab}
        aria-label="Spela"
      >
        <span className="bottom-nav-icon">{isFabOpen ? '✕' : '+'}</span>
      </button>
      <button
        type="button"
        className={`bottom-nav-item ${isMenuOpen ? 'active' : ''}`}
        onClick={toggleMenu}
        aria-label="Meny"
      >
        <span className="bottom-nav-icon">☰</span>
        <span className="bottom-nav-label">Meny</span>
      </button>
    </nav>
  );
};

export default BottomNav;
