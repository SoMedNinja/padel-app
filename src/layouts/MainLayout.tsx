import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import { supabase } from "../supabaseClient";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { user, isGuest, setIsGuest, setUser } = useStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  }, []);

  const handleAuthAction = () => {
    closeMenu();
    if (isGuest) {
      setIsGuest(false);
    } else {
      supabase.auth.signOut();
      setUser(null);
    }
  };

  useEffect(() => {
    if (!isMenuOpen) return;
    const focusable = menuRef.current?.querySelector("a, button") as HTMLElement;
    focusable?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMenuOpen, closeMenu]);

  return (
    <div className="container">
      <div className="app-header">
        <h1 className="app-title">
          <span className="app-logo" aria-hidden="true">GS</span>
          <span className="app-title-text">
            <span className="app-title-name">Grabbarnas serie</span>
            <span className="app-title-subtitle">Padel, prestige & bragging rights</span>
          </span>
        </h1>
        <button
          ref={menuButtonRef}
          className="menu-toggle hide-on-mobile"
          type="button"
          aria-label="Öppna meny"
          aria-expanded={isMenuOpen}
          aria-controls="app-menu"
          onClick={() => setIsMenuOpen(open => !open)}
        >
          ☰
        </button>
      </div>

      {isMenuOpen && <div className="app-menu-backdrop" onClick={closeMenu} />}

      <nav
        id="app-menu"
        ref={menuRef}
        className={`app-menu ${isMenuOpen ? "open" : ""}`}
        aria-label="Huvudmeny"
      >
        <Link to="/" onClick={closeMenu}>Hemskärm</Link>
        <Link to="/profile" onClick={closeMenu}>Spelarprofil</Link>
        <Link to="/history" onClick={closeMenu}>Match-historik</Link>
        {user?.is_admin && <Link to="/admin" onClick={closeMenu}>Admin</Link>}
        <button type="button" className="ghost-button" onClick={handleAuthAction}>
          {isGuest ? "Logga in / skapa konto" : "Logga ut"}
        </button>
      </nav>

      {isGuest && (
        <div className="guest-banner">
          <div className="guest-banner-header">
            <strong>Gästläge</strong>
            <span className="muted">Utforska statistik, men inga ändringar sparas.</span>
          </div>
        </div>
      )}

      <main>{children}</main>

      <>
        {isFabOpen && (
          <div className="fab-overlay" onClick={() => setIsFabOpen(false)}>
            <div className="fab-options">
              {!isGuest && (
                <button
                  type="button"
                  onClick={() => { navigate("/single-game"); setIsFabOpen(false); }}
                >
                  🎾 Enkel match
                </button>
              )}
              <button
                type="button"
                onClick={() => { navigate("/tournament"); setIsFabOpen(false); }}
              >
                🏆 Turnering
              </button>
            </div>
          </div>
        )}
        <button
          type="button"
          className={`fab ${isFabOpen ? 'open' : ''} hide-on-mobile`}
          onClick={() => setIsFabOpen(!isFabOpen)}
          aria-label="Spela"
        >
          {isFabOpen ? '✕' : '+'}
        </button>
      </>

      <nav className="bottom-nav" aria-label="Bottenmeny">
        <Link to="/profile" className="bottom-nav-item" onClick={closeMenu}>
          <span className="bottom-nav-icon">👤</span>
          <span className="bottom-nav-label">Spelare</span>
        </Link>
        <button
          type="button"
          className={`bottom-nav-item primary ${isFabOpen ? 'active' : ''}`}
          onClick={() => { setIsFabOpen(!isFabOpen); setIsMenuOpen(false); }}
          aria-label="Spela"
        >
          <span className="bottom-nav-icon">{isFabOpen ? '✕' : '+'}</span>
        </button>
        <button
          type="button"
          className={`bottom-nav-item ${isMenuOpen ? 'active' : ''}`}
          onClick={() => { setIsMenuOpen(!isMenuOpen); setIsFabOpen(false); }}
          aria-label="Meny"
        >
          <span className="bottom-nav-icon">☰</span>
          <span className="bottom-nav-label">Meny</span>
        </button>
      </nav>
    </div>
  );
}
