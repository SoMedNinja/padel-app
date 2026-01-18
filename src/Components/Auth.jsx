import { useState } from "react";
import { supabase } from "../supabaseClient";

export default function Auth({ onAuth }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSignup, setIsSignup] = useState(false);

  const submit = async () => {
    if (isSignup) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) return alert(error.message);

      await supabase.from("profiles").insert({
        id: data.user.id,
        name,
      });

      onAuth(data.user);
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) return alert(error.message);
      onAuth(data.user);
    }
  };

  return (
    <div className="card">
      <h2>{isSignup ? "Skapa konto" : "Logga in"}</h2>

      {isSignup && (
        <input
          placeholder="Spelarnamn"
          value={name}
          onChange={e => setName(e.target.value)}
        />
      )}

      <input placeholder="Email" onChange={e => setEmail(e.target.value)} />
      <input
        placeholder="Lösenord"
        type="password"
        onChange={e => setPassword(e.target.value)}
      />

      <button onClick={submit}>
        {isSignup ? "Registrera" : "Logga in"}
      </button>

      <p
        style={{ cursor: "pointer", marginTop: 10 }}
        onClick={() => setIsSignup(!isSignup)}
      >
        {isSignup ? "Har konto? Logga in" : "Ny spelare? Skapa konto"}
      </p>
    </div>
  );
}
