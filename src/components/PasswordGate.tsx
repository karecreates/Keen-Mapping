import { useId, useState, type FormEvent } from "react";
import { verifyAccessPassword } from "../lib/accessAuth";
import "./PasswordGate.css";

interface PasswordGateProps {
  onSuccess: () => void;
}

export function PasswordGate({ onSuccess }: PasswordGateProps) {
  const inputId = useId();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const ok = await verifyAccessPassword(password);
      if (!ok) {
        setError("Incorrect password. Please try again.");
        setPassword("");
        return;
      }
      onSuccess();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="password-gate">
      <div className="password-gate__atmosphere" aria-hidden="true" />
      <div className="password-gate__map-wrap" aria-hidden="true">
        <img
          className="password-gate__map"
          src="/us-portal.svg"
          alt=""
        />
      </div>

      <div className="password-gate__panel">
        <img
          className="password-gate__logo"
          src="/Beta_Logo_white.svg"
          alt="Beta"
        />
        <p className="password-gate__eyebrow">Private preview</p>
        <h1 className="password-gate__title">Geographic Insights</h1>
        <p className="password-gate__subtitle">
          Enter the access password to open the Colorado ZIP mapping tool.
        </p>

        <form className="password-gate__form" onSubmit={handleSubmit}>
          <label className="password-gate__label" htmlFor={inputId}>
            Access password
          </label>
          <input
            id={inputId}
            className="password-gate__input"
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError("");
            }}
            placeholder="Enter password"
            required
            disabled={pending}
          />
          {error ? (
            <p className="password-gate__error" role="alert">
              {error}
            </p>
          ) : (
            <p className="password-gate__hint" aria-live="polite">
              Authorized Beta access only
            </p>
          )}
          <button
            type="submit"
            className="password-gate__submit"
            disabled={pending || !password}
          >
            {pending ? "Checking…" : "Enter tool"}
          </button>
        </form>
      </div>
    </div>
  );
}
