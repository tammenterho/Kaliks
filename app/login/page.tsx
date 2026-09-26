"use client";

import { useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;
        throw new Error(payload?.message ?? "Väärä salasana");
      }

      window.location.href = "/";
    } catch (submitError) {
      const errorMessage =
        submitError instanceof Error ? submitError.message : "Kirjautuminen epäonnistui";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-shell">
      <div className="login-card">
        <p className="eyebrow">Yläne</p>
        <h1>Kirjaudu sisään</h1>
        <p className="login-subtitle">Syötä yhteinen salasana mökkisovellukseen.</p>

        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Salasana
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Salasana"
              autoComplete="current-password"
            />
          </label>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Kirjaudutaan..." : "Kirjaudu sisään"}
          </button>
        </form>
      </div>
    </main>
  );
}
