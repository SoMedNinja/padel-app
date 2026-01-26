import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { supabase } from "./supabaseClient";
import { useStore } from "./store/useStore";
import Auth from "./Components/Auth";
import ProfileSetup from "./Components/ProfileSetup";
import MainLayout from "./layouts/MainLayout";
import AppRoutes from "./AppRoutes";
import { useRealtime } from "./hooks/useRealtime";
import ScrollToTop from "./Components/ScrollToTop";
import { useAuthProfile } from "./hooks/useAuthProfile";

export default function App() {
  const { user, setUser, isGuest, setIsGuest } = useStore();
  const { isLoading, errorMessage, refresh } = useAuthProfile();

  useRealtime();

  if (isLoading) {
    return (
      <div className="container">
        <section className="player-section">
          {/* Note for non-coders: this simple message shows while we check login status. */}
          <p className="muted">Laddar inloggning...</p>
        </section>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="container">
        <section className="player-section">
          <div className="notice-banner error" role="alert">
            <span>{errorMessage}</span>
            <button type="button" className="ghost-button" onClick={refresh}>
              Försök igen
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={() => {
                // Note for non-coders: this clears any login state and returns you to the sign-in screen.
                supabase.auth.signOut();
                setIsGuest(false);
                setUser(null);
              }}
            >
              Återgå till inloggningssidan
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (!user && !isGuest) {
    return (
      <Auth
        onAuth={(authUser) => {
          setIsGuest(false);
          setUser({ ...authUser } as any);
        }}
        onGuest={() => setIsGuest(true)}
      />
    );
  }

  // Check if profile setup is needed
  if (user && !user.name && !isGuest) {
    return (
      <div className="container">
        <ProfileSetup
          user={user}
          initialName={user.name}
          onComplete={(updatedProfile: any) => {
            setUser({ ...user, ...updatedProfile });
          }}
        />
      </div>
    );
  }

  // Approval gate
  if (user && !user.is_admin && !user.is_approved && !isGuest) {
    return (
      <div className="container">
        <section className="player-section approval-gate">
          <h2>Väntar på godkännande</h2>
          <p className="muted">
            En administratör behöver godkänna din åtkomst innan du kan använda
            appen fullt ut.
          </p>
          <button type="button" onClick={() => supabase.auth.signOut()}>
            Logga ut
          </button>
        </section>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Toaster position="top-center" richColors />
      <MainLayout>
        <AppRoutes />
      </MainLayout>
    </BrowserRouter>
  );
}
