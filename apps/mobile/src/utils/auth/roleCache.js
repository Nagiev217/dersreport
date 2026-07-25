import AsyncStorage from "@react-native-async-storage/async-storage";

// Cached role is tagged with the uid it belongs to, so a stale cache left
// behind by a previously signed-in account on this device can never be
// mistaken for the currently authenticated user's role.
const KEY = "userRoleCache";

export async function getCachedRole(uid) {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.uid === uid ? parsed.role : null;
  } catch {
    return null;
  }
}

export async function setCachedRole(uid, role) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify({ uid, role }));
  } catch {}
}

export async function clearCachedRole() {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
}
