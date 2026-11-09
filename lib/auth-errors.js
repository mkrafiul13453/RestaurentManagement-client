import { getSafeDisplayMessage } from "./safe-message.js";

export function getAuthErrorMessage(error, mode = "sign-in") {
  const status = Number(error?.status ?? error?.statusCode);
  const message = typeof error?.message === "string" ? error.message : "";

  if (status === 429) {
    return "Too many authentication attempts. Please wait a few minutes and try again.";
  }
  if (status >= 500) {
    return "The authentication service is unavailable. Check that the Restora API is running and connected to MongoDB.";
  }
  if (
    error instanceof TypeError ||
    /failed to fetch|fetch failed|networkerror|network request failed|load failed/i.test(message)
  ) {
    return "Cannot reach the Restora API. Start the server and verify NEXT_PUBLIC_API_URL, then try again.";
  }
  if (status === 401 && mode === "sign-in") {
    return "Email or password is incorrect. Check your details and try again.";
  }

  const safeMessage = getSafeDisplayMessage(message, "");
  if (safeMessage) return safeMessage;

  return mode === "sign-up"
    ? "We couldn't create your account. Check your details and try again."
    : "We couldn't sign you in. Check your details and try again.";
}
