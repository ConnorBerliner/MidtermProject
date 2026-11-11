import toast from "react-hot-toast";
import { toApiError } from "../api/errors";

export function notifyError(err: unknown): void {
  const error = toApiError(err);
  if (error.status === 401) return;
  toast.error(error.message, { id: `error-${error.status}` });
}