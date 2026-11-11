import { useState } from "react";
import { toApiError, type FieldErrors } from "../api/errors";
import { AuthForm, type AuthMode } from "../components/AuthForm";
import { notifyError } from "../lib/notify";
import type { Credentials } from "../types/api";
import { useAppDispatch } from "../store/hooks";
import { login, register } from "../store/authSlice";

export function AuthContainer() {
  const dispatch = useAppDispatch();

  const [mode, setMode] = useState<AuthMode>("login");
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(credentials: Credentials) {
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      if (mode === "login") await dispatch(login(credentials));
    else await dispatch(register(credentials));
    } catch (err) {
      const error = toApiError(err);
      const hasFieldErrors = Object.keys(error.fieldErrors).length > 0;
      setFieldErrors(error.fieldErrors);
      setFormError(hasFieldErrors ? null : error.message);
      if (error.status === 0 || error.status >= 500) notifyError(error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthForm
      mode={mode}
      submitting={submitting}
      fieldErrors={fieldErrors}
      formError={formError}
      onSubmit={(c) => void handleSubmit(c)}
      onToggleMode={() =>
        setMode((m) => (m === "login" ? "register" : "login"))
      }
    />
  );
}
