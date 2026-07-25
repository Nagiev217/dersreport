import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
  getAdditionalUserInfo,
} from 'firebase/auth';
import { auth, IS_FIREBASE_READY } from './config';
import { getUserDoc } from './users';

// ─── Google OAuth client IDs ──────────────────────────────────────────────────
// Get these from Firebase Console → Project Settings → Your apps
// OR Google Cloud Console → APIs & Services → Credentials
export const GOOGLE_CONFIG = {
  // Web OAuth 2.0 Client ID (Firebase Console → Authentication → Sign-in method → Google → Web SDK configuration)
  webClientId: '646856024233-ae3ccghplojhh3b49lkhfm69ebslaht7.apps.googleusercontent.com',
  // iOS Client ID (Firebase Console → Project Settings → iOS app → GoogleService-Info.plist → CLIENT_ID)
  iosClientId: '646856024233-drjebfji9qa359m108ugtdjsh5v3ltfs.apps.googleusercontent.com',
  // Android Client ID (Firebase Console → Project Settings → Android app)
  androidClientId: '646856024233-ae3ccghplojhh3b49lkhfm69ebslaht7.apps.googleusercontent.com',
};

export const OAUTH_CONFIGURED = !GOOGLE_CONFIG.webClientId.startsWith('YOUR_');

// ─── Google ───────────────────────────────────────────────────────────────────

export async function signInWithGoogleToken(idToken) {
  if (!IS_FIREBASE_READY || !auth) throw new Error('Firebase not ready');
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);
  const additionalInfo = getAdditionalUserInfo(result);
  return { user: result.user, isNew: additionalInfo?.isNewUser ?? false };
}

// ─── Apple ────────────────────────────────────────────────────────────────────

export async function signInWithAppleToken(idToken, rawNonce) {
  if (!IS_FIREBASE_READY || !auth) throw new Error('Firebase not ready');
  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({ idToken, rawNonce });
  const result = await signInWithCredential(auth, credential);
  const additionalInfo = getAdditionalUserInfo(result);
  return { user: result.user, isNew: additionalInfo?.isNewUser ?? false };
}

// ─── Post-OAuth routing logic ─────────────────────────────────────────────────
// Returns { needsRole: true } if new user, or { role: 'teacher'|'parent' } if existing

export async function resolveOAuthUser(uid) {
  const userData = await getUserDoc(uid);
  let role = userData?.role;
  if (!role) {
    const { getMyRoleRemote } = await import('./adminAccounts');
    role = await getMyRoleRemote().catch(() => null);
  }
  if (!role) return { needsRole: true };
  return { needsRole: false, role };
}

// ─── Error messages ───────────────────────────────────────────────────────────

export function getOAuthError(err) {
  if (!err) return 'Произошла ошибка';
  const code = err.code ?? '';
  if (code.includes('cancelled') || code.includes('user-cancelled') || err.message?.includes('cancel')) {
    return null; // User cancelled — no need to show error
  }
  if (code === 'auth/account-exists-with-different-credential') {
    return 'Этот email уже используется с другим методом входа';
  }
  if (code === 'auth/network-request-failed') return 'Нет подключения к интернету';
  if (code === 'auth/popup-closed-by-user') return null;
  if (code === 'ERR_REQUEST_CANCELED') return null;
  return 'Ошибка входа. Попробуйте снова';
}
