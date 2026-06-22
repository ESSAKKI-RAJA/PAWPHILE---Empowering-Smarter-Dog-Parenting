import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider, useAuth, useUser } from "@clerk/clerk-react";
import App from "./App.tsx";
import "./index.css";
import { registerTokenProvider } from "./services/apiClient";

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
