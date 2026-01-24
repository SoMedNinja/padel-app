import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { useStore } from "./store/useStore";
import Auth from "./Components/Auth";
import ProfileSetup from "./Components/ProfileSetup";
import MainLayout from "./layouts/MainLayout";
import AppRoutes from "./AppRoutes";
import { useRealtime } from "./hooks/useRealtime";

export default function App() {
  const { user, setUser, isGuest, setIsGuest } = useStore();

  useRealtime();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single()
          .then(({ data: profile }) => {
            setUser({ ...data.user, ...profile });
          });
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single()
          .then(({ data: profile }) => {
            setUser({ ...session.user, ...profile });
          });
      } else {
        setUser(null);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [setUser]);

  if (!user && !isGuest) {
    return (
      <Auth
        onAuth={() => {
          setIsGuest(false);
          return supabase.auth.getUser().then(({ data }) => {
            if (data.user) setUser(data.user);
          });
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
      <MainLayout>
        <AppRoutes />
      </MainLayout>
    </BrowserRouter>
  );
}
