import type { FormEvent } from "react";
import type { FieldErrors } from "../api/errors";
import type { Credentials } from "../types/api";

export type AuthMode = "login" | "register";

interface AuthFormProps {
  mode: AuthMode;
  submitting: boolean;
  fieldErrors: FieldErrors;
  formError: string | null;
  onSubmit: (credentials: Credentials) => void;
  onToggleMode: () => void;
}

function FieldError({ id, messages }: { id: string; messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p id={id} role="alert" className="field-error">
      {messages.join(" ")}
    </p>
  );
}

export function AuthForm({
  mode, submitting, fieldErrors, formError, onSubmit, onToggleMode,
}: AuthFormProps) {
  const isLogin = mode === "login";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onSubmit({
      username: String(data.get("username") ?? ""),
      password: String(data.get("password") ?? ""),
    });
  }

  return (
    <form className="auth" onSubmit={handleSubmit}>
      <h1>{isLogin ? "Sign in" : "Create account"}</h1>

      <label htmlFor="username">Username</label>
      <input
        id="username" name="username" autoComplete="username" required
        aria-invalid={Boolean(fieldErrors.username)} aria-describedby="username-error"
      />
      <FieldError id="username-error" messages={fieldErrors.username} />

      <label htmlFor="password">Password</label>
      <input
        id="password" name="password" type="password" required minLength={isLogin ? 1 : 8}
        autoComplete={isLogin ? "current-password" : "new-password"}
        aria-invalid={Boolean(fieldErrors.password)} aria-describedby="password-error"
      />
      <FieldError id="password-error" messages={fieldErrors.password} />

      {formError && <p role="alert" className="field-error">{formError}</p>}

      <button type="submit" disabled={submitting}>
        {submitting ? "Please wait…" : isLogin ? "Sign in" : "Register"}
      </button>
      <button type="button" className="link" onClick={onToggleMode}>
        {isLogin ? "Need an account? Register" : "Have an account? Sign in"}
      </button>
    </form>
  );
}