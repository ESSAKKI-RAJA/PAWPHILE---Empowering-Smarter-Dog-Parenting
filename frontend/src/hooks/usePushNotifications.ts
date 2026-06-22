import { useEffect, useCallback } from "react";
import {
  messaging,
  requestNotificationPermission,
  setupForegroundMessageHandler,
} from "../lib/firebase";

interface NotificationMessage {
  title?: string;
  body?: string;
  data?: Record<string, any>;
  notification?: {
    title?: string;
    body?: string;
    icon?: string;
  };
}

/**
 * Hook to set up push notifications
 * Call this once on app initialization (typically after user login)
 */
export const usePushNotifications = () => {
  const requestPermission = useCallback(async () => {
    try {
      const token = await requestNotificationPermission();
      if (token) {
        console.log("FCM Token obtained:", token);
        // Store token in localStorage for later reference
        localStorage.setItem("fcm_token", token);
        return token;
      }
    } catch (error) {
      console.error("Failed to request notification permission:", error);
    }
    return null;
  }, []);

  const showNotification = useCallback((message: NotificationMessage) => {
    // Only show notification if browser supports it and permission granted
    if ("Notification" in window && Notification.permission === "granted") {
      const title =
        message.title || message.notification?.title || "PAWPHILE Alert";
      const body =
        message.body || message.notification?.body || "You have a new message";

      const notification = new Notification(title, {
        body,
        icon: message.notification?.icon || "/pawphile-icon.png",
        tag: "pawphile-notification",
        requireInteraction: false,
      });

      // Handle notification click
      notification.onclick = () => {
        window.focus();
        notification.close();

        // Navigate to relevant page based on message data
        if (message.data?.type === "critical_alert") {
          window.location.href = "/pawnews";
        }
      };
    }
  }, []);

  // Set up foreground message listener on mount
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    try {
      unsubscribe = setupForegroundMessageHandler((payload: any) => {
        console.log("Received foreground message:", payload);

        // Show a toast-like notification
        if (payload.notification) {
          showNotification(payload);
        }
      });
    } catch (error) {
      console.error("Failed to set up foreground message handler:", error);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [showNotification]);

  return { requestPermission, showNotification };
};

export default usePushNotifications;
