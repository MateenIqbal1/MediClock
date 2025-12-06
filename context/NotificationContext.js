import React, { createContext, useState, useCallback } from 'react';

export const NotificationContext = createContext();

let globalTrigger = null;

export function setGlobalNotificationTrigger(trigger) {
  globalTrigger = trigger;
}

export function getGlobalNotificationTrigger() {
  return globalTrigger;
}

export function NotificationProvider({ children }) {
  const [lastNotificationAction, setLastNotificationAction] = useState(null);
  const [notificationReceived, setNotificationReceived] = useState(null);

  const triggerNotificationAction = useCallback((medicationId, status) => {
    setLastNotificationAction({ medicationId, status, timestamp: Date.now() });
  }, []);

  const triggerNotificationReceived = useCallback(() => {
    setNotificationReceived({ timestamp: Date.now() });
  }, []);

  // Set global reference so App.js can call it
  React.useEffect(() => {
    setGlobalNotificationTrigger(triggerNotificationAction);
    window.triggerNotificationReceived = triggerNotificationReceived;
  }, [triggerNotificationAction, triggerNotificationReceived]);

  return (
    <NotificationContext.Provider value={{ lastNotificationAction, triggerNotificationAction, notificationReceived }}>
      {children}
    </NotificationContext.Provider>
  );
}
