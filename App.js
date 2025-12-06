// App.js
import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as Notifications from 'expo-notifications';

import AuthScreen from "./src/screens/AuthScreen";
import HomeScreen from "./src/screens/HomeScreen";
import AddMedicationScreen from "./src/screens/AddMedicationScreen";
import CalendarViewScreen from "./src/screens/CalendarViewScreen";
import HistoryLogScreen from "./src/screens/HistoryLogScreen";
import NotificationsScreen from "./src/screens/NotificationsScreen";

import { initDB, updateMedicationStatus, insertNotificationHistory } from "./database/db";

import {
  askNotificationPermission,
  registerNotificationActions,
  registerNotificationResponseHandler,
} from "./notification/index";

import { NotificationProvider, getGlobalNotificationTrigger } from "./context/NotificationContext";

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    (async () => {
      try {
        // Initialize SQLite DB
        await initDB();
        console.log("App: initDB completed");
      } catch (e) {
        console.warn("App: initDB error", e);
      }

      try {
        // Request notification permission
        if (typeof askNotificationPermission === 'function') {
          await askNotificationPermission();
        }

        // Register Take button
        if (typeof registerNotificationActions === 'function') {
          registerNotificationActions();
        }

        // Handle Take events with context trigger
        if (typeof registerNotificationResponseHandler === 'function') {
          registerNotificationResponseHandler((medId, status) => {
            // Log to DB
            updateMedicationStatus(medId, status);
            // Trigger UI update via context
            const trigger = getGlobalNotificationTrigger();
            if (trigger) {
              trigger(medId, status);
            }
          });
        }

        // Log notification when it actually fires (not when scheduled)
        Notifications.addNotificationReceivedListener(notification => {
          const { medicationId, name, dosage } = notification.request.content.data || {};
          const { title, body } = notification.request.content;
          
          if (medicationId) {
            insertNotificationHistory({
              medicationId,
              medicationName: name,
              dosage: dosage || '',
              title,
              body,
              notificationTime: new Date().toISOString(),
            }).then(() => {
              // Trigger notification count refresh
              if (typeof window !== 'undefined' && window.triggerNotificationReceived) {
                window.triggerNotificationReceived();
              }
            }).catch(err => console.warn('Failed to log notification history', err));
          }
        });
      } catch (e) {
        console.warn("App: notification setup error", e);
      }
    })();
  }, []);

  return (
    <NotificationProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Auth">
        <Stack.Screen
          name="Auth"
          component={AuthScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="AddMedication"
          component={AddMedicationScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="CalendarView"
          component={CalendarViewScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="HistoryLog"
          component={HistoryLogScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{ headerShown: false }}
        />
        </Stack.Navigator>
      </NavigationContainer>
    </NotificationProvider>
  );
}
