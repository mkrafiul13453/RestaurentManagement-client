import { createAuthClient } from "better-auth/react";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
if (!apiUrl) {
  throw new Error("NEXT_PUBLIC_API_URL must be set to the Restora server origin");
}

export const authClient = createAuthClient({
  baseURL: apiUrl,
});
