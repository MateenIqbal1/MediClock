import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Show alerts even when the app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('mediclock-reminders', {
    name: 'Medication Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

export async function askNotificationPermission() {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED) {
    await ensureAndroidChannel();
    return true;
  }

  const request = await Notifications.requestPermissionsAsync();
  const granted = request.granted || request.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED;
  if (granted) {
    await ensureAndroidChannel();
  }
  return granted;
}

// Backward-compatible alias
export async function requestNotificationPermission() {
  return askNotificationPermission();
}

export async function registerNotificationActions() {
  // Adds action buttons on supported platforms (Android 13+)
  try {
    await Notifications.setNotificationCategoryAsync('medication-reminder', [
      { identifier: 'TAKE', buttonTitle: 'Taken' },
    ]);
  } catch (err) {
    console.warn('registerNotificationActions error', err);
  }
}

export function registerNotificationResponseHandler(callback) {
  // callback signature: (medicationId, status) => void
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const action = response.actionIdentifier;
    const medId = response.notification.request.content.data?.medicationId;
    if (typeof callback === 'function' && medId != null) {
      const status = action === 'TAKE' ? 'taken' : 'opened';
      if (status === 'taken') {
        callback(medId, status);
        console.log('Notification action: medicationId', medId, 'status', status);
      }
    }
  });
}

export async function scheduleMedicationNotification(med) {
  // med: { id, name, time, reminders, frequency }
  if (!med?.reminders) return null;

  const hasPermission = await askNotificationPermission();
  if (!hasPermission) {
    console.warn('Notification permission not granted');
    return null;
  }

  await ensureAndroidChannel();

  // Use the exact selected datetime; if in the past, move to next day
  const target = med.time ? new Date(med.time) : new Date();
  const now = new Date();
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Medication reminder',
      body: med.name ? `Time to take ${med.name}` : 'Time to take your medication',
      sound: 'default',
      data: { medicationId: med.id, name: med.name, dosage: med.dosage },
      categoryIdentifier: 'medication-reminder',
    },
    trigger: target,
  });

  return notificationId;
}

export async function updateMedicationStatus(medicationId, status) {
  // Placeholder: integrate with DB if needed
  console.warn('updateMedicationStatus: not yet implemented', medicationId, status);
}