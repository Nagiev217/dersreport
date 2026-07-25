import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { saveFcmToken } from './users';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerPushToken(uid, role) {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    let finalStatus = status;
    if (status !== 'granted') {
      const { status: next } = await Notifications.requestPermissionsAsync();
      finalStatus = next;
    }
    if (finalStatus !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'DərsReport',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6B5CF6',
      });
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync();
    if (uid && role) await saveFcmToken(uid, role, token);
    return token;
  } catch {
    return null;
  }
}

// Notification type constants — used when triggering from Cloud Functions
export const NOTIF = {
  NEW_REPORT: 'new_report',
  NEW_LESSON: 'new_lesson',
  LESSON_RESCHEDULED: 'lesson_rescheduled',
  LESSON_CANCELLED: 'lesson_cancelled',
  NEW_HOMEWORK: 'new_homework',
  CHILD_LINKED: 'child_linked',
};
