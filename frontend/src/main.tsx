import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import App from "./App.tsx";
import "./index.css";
import { registerTokenProvider } from "./services/apiClient";
import { registerChatTokenProvider } from "./services/chatEngine";
import { registerFoundationTokenProvider } from "./services/foundationApi";
import { flushQueue } from "./services/syncQueue";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  console.warn(
    "[PAWPHILE] Missing VITE_CLERK_PUBLISHABLE_KEY. Auth features will be disabled.",
  );
}

/** Registers Clerk's getToken into apiClient and syncs user on first sign-in. */
// eslint-disable-next-line react-refresh/only-export-components
function ClerkBridge() {
  const { getToken } = useAuth();
  // Removed unused user, isSignedIn

  useEffect(() => {
    registerTokenProvider(() => getToken());
    registerChatTokenProvider(() => getToken());
    registerFoundationTokenProvider(() => getToken());
  }, [getToken]);

  return null;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {PUBLISHABLE_KEY ? (
      <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
        <ClerkBridge />
        <App />
      </ClerkProvider>
    ) : (
      <App />
    )}
  </StrictMode>,
);

// Register Firebase Cloud Messaging service worker for push notifications
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/firebase-messaging-sw.js")
    .catch((error) => {
      console.warn("[PAWPHILE] Service Worker registration failed:", error);
    });
}

// BIN1: flush idempotent sync queue when connectivity returns.
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    flushQueue().catch(() => undefined);
  });
}
