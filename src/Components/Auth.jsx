import { useState } from "react";
import { supabase } from "../supabaseClient";

export default function Auth({ onAuth, onGuest }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resolveSiteUrl = () => {
    const authRedirectUrl = import.meta.env.VITE_AUTH_REDIRECT_URL;
    if (authRedirectUrl) {
      return authRedirectUrl.endsWith("/")
        ? authRedirectUrl.slice(0, -1)
        : authRedirectUrl;
    }
    const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
    return siteUrl.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl;
  };

  const submit = async () => {
    if (isSubmitting) return;
    setNotice("");
    if (!email || !password) {
      setNotice("Fyll i både e-post och lösenord.");
      return;
    }
    setIsSubmitting(true);
    if (isSignup) {
      const siteUrl = resolveSiteUrl();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: siteUrl,
        },
      });

      if (error) {
        alert(error.message);
        setIsSubmitting(false);
        return;
      }
      if (data?.session?.user) {
        onAuth(data.session.user);
        setIsSubmitting(false);
        return;
      }
      setNotice("Bekräftelselänk skickad! Kolla din e-post för att aktivera kontot.");
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        alert(error.message);
        setIsSubmitting(false);
        return;
      }
      onAuth(data.user);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="card">
      <h2>{isSignup ? "Skapa konto" : "Logga in"}</h2>

      <input placeholder="Email" onChange={e => setEmail(e.target.value)} />
      <input
        placeholder="Lösenord"
        type="password"
        onChange={e => setPassword(e.target.value)}
      />

      <button onClick={submit} disabled={isSubmitting}>
        {isSubmitting ? "Skickar..." : isSignup ? "Registrera" : "Logga in"}
      </button>
      {notice ? <p className="auth-notice">{notice}</p> : null}

      <p
        style={{ cursor: "pointer", marginTop: 10 }}
        onClick={() => setIsSignup(!isSignup)}
      >
        {isSignup ? "Har konto? Logga in" : "Ny spelare? Skapa konto"}
      </p>

      <button type="button" className="ghost-button" onClick={onGuest}>
        Fortsätt som gäst
      </button>
    </div>
  );
}
