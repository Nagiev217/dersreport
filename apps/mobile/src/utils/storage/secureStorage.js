// AES-256-CBC-encrypted AsyncStorage adapter for zustand's `persist` middleware.
//
// Why: payments/reports/progress/homework hold real PII (names, contact info,
// free-text notes, amounts) and previously landed in AsyncStorage as plain
// JSON — readable by anything with filesystem access to the device (backup
// extraction tools, a compromised app on a rooted/jailbroken device, etc.),
// with no OS-level encryption guarantee the way Keychain/Keystore-backed
// storage has.
//
// Design: the AES key itself lives in SecureStore (Keychain/Keystore-backed,
// small — just a 256-bit hex string, well under SecureStore's item-size
// limit) and is generated once per device via expo-crypto's CSPRNG. The bulk
// data (which can grow to hundreds of KB) stays in AsyncStorage, but
// encrypted — SecureStore itself is unsuitable for arrays that grow over
// time. Each write gets a fresh random IV (also CSPRNG, not CryptoJS's
// Math.random-backed WordArray.random) so identical plaintexts don't produce
// identical ciphertexts.
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import CryptoJS from "crypto-js";

const KEY_STORAGE_NAME = "app-encryption-key-v1";

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

let keyPromise = null;
function getEncryptionKeyHex() {
  if (!keyPromise) {
    keyPromise = (async () => {
      let key = await SecureStore.getItemAsync(KEY_STORAGE_NAME);
      if (!key) {
        const randomBytes = await Crypto.getRandomBytesAsync(32); // 256-bit
        key = bytesToHex(randomBytes);
        await SecureStore.setItemAsync(KEY_STORAGE_NAME, key);
      }
      return key;
    })();
  }
  return keyPromise;
}

async function encrypt(plaintext) {
  const keyHex = await getEncryptionKeyHex();
  const ivBytes = await Crypto.getRandomBytesAsync(16);
  const ivHex = bytesToHex(ivBytes);
  const key = CryptoJS.enc.Hex.parse(keyHex);
  const iv = CryptoJS.enc.Hex.parse(ivHex);
  const ciphertext = CryptoJS.AES.encrypt(plaintext, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  }).toString();
  return `${ivHex}:${ciphertext}`;
}

async function decrypt(payload) {
  const sep = payload.indexOf(":");
  if (sep === -1) return null; // not our format — e.g. pre-migration plaintext
  const ivHex = payload.slice(0, sep);
  const ciphertext = payload.slice(sep + 1);
  const keyHex = await getEncryptionKeyHex();
  const key = CryptoJS.enc.Hex.parse(keyHex);
  const iv = CryptoJS.enc.Hex.parse(ivHex);
  const bytes = CryptoJS.AES.decrypt(ciphertext, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return bytes.toString(CryptoJS.enc.Utf8);
}

// zustand's createJSONStorage expects a factory returning { getItem, setItem, removeItem }.
export function createEncryptedStorage() {
  return {
    getItem: async (name) => {
      const raw = await AsyncStorage.getItem(name);
      if (!raw) return null;
      try {
        const plaintext = await decrypt(raw);
        if (plaintext) return plaintext;
        // Falls through to the legacy-plaintext path below (pre-migration
        // data, or a bad/foreign payload) rather than losing the record.
      } catch (e) {
        console.error(`[secureStorage] failed to decrypt "${name}":`, e);
      }
      // Legacy plaintext fallback: a device that persisted data before this
      // migration will have raw JSON here. Read it once as-is so existing
      // data isn't wiped out; the very next setItem re-saves it encrypted.
      try {
        JSON.parse(raw);
        return raw;
      } catch {
        return null;
      }
    },
    setItem: async (name, value) => {
      const encrypted = await encrypt(value);
      await AsyncStorage.setItem(name, encrypted);
    },
    removeItem: async (name) => {
      await AsyncStorage.removeItem(name);
    },
  };
}
