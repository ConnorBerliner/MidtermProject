import axios from "axios";

export type FieldErrors = Record<string, string[]>;

export class ApiError extends Error {
  status: number;
  fieldErrors: FieldErrors;

  constructor(status: number, message: string, fieldErrors: FieldErrors = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

type DrfErrorBody = { detail?: string } & Record<string, unknown>;

const DEFAULT_MESSAGES: Record<number, string> = {
  400: "Check your input.",
  401: "Expired Session.",
  403: "Invalid Permissions.",
  404: "Couldn't find the page.",
  500: "Issue on this side of the connection, not on the user.",
};

export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;

  if (axios.isAxiosError<DrfErrorBody>(err)) {
    if (!err.response) return new ApiError(0, "Network error.");

    const { status, data } = err.response;
    const fieldErrors: FieldErrors = {};
    let message = DEFAULT_MESSAGES[status] ?? "Unexpected error.";

    if (data && typeof data === "object") {
      if (typeof data.detail === "string") message = data.detail;
      for (const [key, value] of Object.entries(data)) {
        if (key !== "detail" && Array.isArray(value)) fieldErrors[key] = value.map(String);
      }
      const nonField = fieldErrors["non_field_errors"];
      if (nonField?.length) message = nonField[0];
    }
    return new ApiError(status, message, fieldErrors);
  }

  return new ApiError(-1, err instanceof Error ? err.message : "Unknown error");
}