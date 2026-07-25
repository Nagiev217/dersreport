// ╔════════════════════════════════════════════════════════════════╗
// ║  КАК НАСТРОИТЬ FIREBASE (одноразово, ~5 минут)                ║
// ║                                                                ║
// ║  1. Открой https://console.firebase.google.com                ║
// ║  2. "Создать проект" → придумай название → без Analytics       ║
// ║  3. Authentication → Sign-in method → Email/Password → вкл    ║
// ║  4. Firestore Database → Создать базу → Начать в тест. режиме  ║
// ║  5. Настройки проекта (⚙) → Веб-приложение (+) →              ║
// ║     Скопируй firebaseConfig ниже                              ║
// ╚════════════════════════════════════════════════════════════════╝

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from 'firebase/auth';

// ← ЗАПОЛНИ ЭТО СВОИМИ ДАННЫМИ ИЗ FIREBASE CONSOLE
const firebaseConfig = {
  apiKey: "AIzaSyDfFttQXnZBd6h3jzF82hGAb5ptO3z6OUg",
  authDomain: "dersreport.firebaseapp.com",
  projectId: "dersreport",
  storageBucket: "dersreport.firebasestorage.app",
  messagingSenderId: "646856024233",
  appId: "1:646856024233:web:33ad9795909d63aa8389b8",
};

export const IS_FIREBASE_READY =
  !!firebaseConfig.apiKey && firebaseConfig.apiKey !== "ВСТАВЬ_СЮДА";

let _auth = null;
let _db = null;
let _app = null;

if (IS_FIREBASE_READY) {
  _app = getApps().length
    ? getApps()[0]
    : initializeApp(firebaseConfig);

  try {
    _auth = initializeAuth(_app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    _auth = getAuth(_app);
  }

  _db = getFirestore(_app);
}

export const auth = _auth;
export const db = _db;
export const firebaseApp = _app;
