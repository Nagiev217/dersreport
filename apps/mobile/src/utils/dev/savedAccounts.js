import * as SecureStore from "expo-secure-store";

// Every successful email/password sign-in (login.jsx) saves its credentials
// here, keyed by role, in the device's encrypted keystore (not AsyncStorage,
// not git). DevAccountSwitcher reads this to offer instant switching between
// every account you've ever actually logged into on this device — no manual
// config file to edit.
const KEY = "saved_accounts_v1";

export async function getSavedAccounts() {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export async function saveAccount(role, { email, password, displayName }) {
  if (!role || !email || !password) return;
  try {
    const all = await getSavedAccounts();
    all[role] = { email, password, displayName: displayName ?? "" };
    await SecureStore.setItemAsync(KEY, JSON.stringify(all));
  } catch {
    // Best-effort — never block a real login on this.
  }
}
