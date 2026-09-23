import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';

const PIN_HASH_KEY = 'applock_pin_hash';
const PIN_SALT_KEY = 'applock_pin_salt';
const SECURITY_QUESTION_KEY = 'applock_security_question';
const SECURITY_ANSWER_HASH_KEY = 'applock_security_answer_hash';
const SECURITY_ANSWER_SALT_KEY = 'applock_security_answer_salt';

async function hashWithSalt(value: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${value}`);
}

function normalizeAnswer(answer: string): string {
  return answer.trim().toLowerCase();
}

export async function hasPinSet(): Promise<boolean> {
  const hash = await SecureStore.getItemAsync(PIN_HASH_KEY);
  return !!hash;
}

export async function setPin(pin: string): Promise<void> {
  const salt = Crypto.randomUUID();
  const hash = await hashWithSalt(pin, salt);
  await SecureStore.setItemAsync(PIN_SALT_KEY, salt);
  await SecureStore.setItemAsync(PIN_HASH_KEY, hash);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const salt = await SecureStore.getItemAsync(PIN_SALT_KEY);
  const storedHash = await SecureStore.getItemAsync(PIN_HASH_KEY);
  if (!salt || !storedHash) return false;
  const hash = await hashWithSalt(pin, salt);
  return hash === storedHash;
}

export async function clearPin(): Promise<void> {
  await SecureStore.deleteItemAsync(PIN_HASH_KEY);
  await SecureStore.deleteItemAsync(PIN_SALT_KEY);
}

/**
 * PIN recovery via a security question. Resetting the PIN this way only
 * touches these SecureStore keys — the app's SQLite data is never wiped.
 */
export async function getSecurityQuestion(): Promise<string | null> {
  return SecureStore.getItemAsync(SECURITY_QUESTION_KEY);
}

export async function hasSecurityQuestion(): Promise<boolean> {
  return (await getSecurityQuestion()) !== null;
}

export async function setSecurityQuestion(question: string, answer: string): Promise<void> {
  const salt = Crypto.randomUUID();
  const hash = await hashWithSalt(normalizeAnswer(answer), salt);
  await SecureStore.setItemAsync(SECURITY_QUESTION_KEY, question);
  await SecureStore.setItemAsync(SECURITY_ANSWER_SALT_KEY, salt);
  await SecureStore.setItemAsync(SECURITY_ANSWER_HASH_KEY, hash);
}

export async function verifySecurityAnswer(answer: string): Promise<boolean> {
  const salt = await SecureStore.getItemAsync(SECURITY_ANSWER_SALT_KEY);
  const storedHash = await SecureStore.getItemAsync(SECURITY_ANSWER_HASH_KEY);
  if (!salt || !storedHash) return false;
  const hash = await hashWithSalt(normalizeAnswer(answer), salt);
  return hash === storedHash;
}

export async function clearSecurityQuestion(): Promise<void> {
  await SecureStore.deleteItemAsync(SECURITY_QUESTION_KEY);
  await SecureStore.deleteItemAsync(SECURITY_ANSWER_HASH_KEY);
  await SecureStore.deleteItemAsync(SECURITY_ANSWER_SALT_KEY);
}

export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  } catch {
    return false;
  }
}

export async function authenticateWithBiometrics(): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Expense Tracker',
      cancelLabel: 'Use PIN instead',
      disableDeviceFallback: true,
    });
    return result.success;
  } catch {
    return false;
  }
}
