import { useEffect, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../hooks/useThemeColors';
import { useAppStore } from '../store/useAppStore';
import {
  authenticateWithBiometrics,
  getSecurityQuestion,
  setPin,
  verifyPin,
  verifySecurityAnswer,
} from '../services/authLockService';
import { spacing, radius } from '../constants/theme';
import PinEntry from './PinEntry';

interface AppLockScreenProps {
  onUnlock: () => void;
}

type Mode = 'pin' | 'forgot' | 'reset-new' | 'reset-confirm';

export default function AppLockScreen({ onUnlock }: AppLockScreenProps) {
  const colors = useThemeColors();
  const biometricLockEnabled = useAppStore((s) => s.settings.biometricLockEnabled);

  const [mode, setMode] = useState<Mode>('pin');
  const [pinError, setPinError] = useState<string | null>(null);
  const [resetSignal, setResetSignal] = useState(0);

  const [question, setQuestion] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [pendingNewPin, setPendingNewPin] = useState('');

  useEffect(() => {
    if (!biometricLockEnabled) return;
    let cancelled = false;
    authenticateWithBiometrics().then((ok) => {
      if (ok && !cancelled) onUnlock();
    });
    return () => {
      cancelled = true;
    };
    // Only auto-prompt once, when the lock screen first appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retryBiometric = async () => {
    const ok = await authenticateWithBiometrics();
    if (ok) onUnlock();
  };

  const handlePinComplete = async (pin: string) => {
    const ok = await verifyPin(pin);
    if (ok) {
      setPinError(null);
      onUnlock();
    } else {
      setPinError('Incorrect PIN');
      setResetSignal((n) => n + 1);
    }
  };

  const openForgot = async () => {
    setQuestion(await getSecurityQuestion());
    setAnswer('');
    setForgotError(null);
    setMode('forgot');
  };

  const submitAnswer = async () => {
    const ok = await verifySecurityAnswer(answer);
    if (!ok) {
      setForgotError('That answer is incorrect.');
      return;
    }
    setForgotError(null);
    setPinError(null);
    setMode('reset-new');
  };

  const handleResetPinComplete = async (pin: string) => {
    if (mode === 'reset-new') {
      setPinError(null);
      setPendingNewPin(pin);
      setMode('reset-confirm');
      return;
    }
    if (pin !== pendingNewPin) {
      setPinError("PINs didn't match. Try again.");
      setResetSignal((n) => n + 1);
      setMode('reset-new');
      return;
    }
    // Only rewrites the PIN's SecureStore entry — the app's data is untouched.
    await setPin(pin);
    onUnlock();
  };

  if (mode === 'forgot') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
        <Ionicons name="help-circle-outline" size={40} color={colors.primary} style={{ marginBottom: spacing.lg }} />
        {question ? (
          <>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: spacing.lg }}>
              {question}
            </Text>
            <TextInput
              value={answer}
              onChangeText={setAnswer}
              placeholder="Your answer"
              placeholderTextColor={colors.textLight}
              autoCapitalize="none"
              autoFocus
              style={{
                width: '100%',
                backgroundColor: colors.card,
                borderRadius: radius.md,
                padding: spacing.md,
                fontSize: 15,
                color: colors.text,
                textAlign: 'center',
                marginBottom: spacing.sm,
              }}
            />
            <Text style={{ fontSize: 13, color: colors.expense, marginBottom: spacing.md, minHeight: 18 }}>{forgotError ?? ''}</Text>
            <TouchableOpacity
              onPress={submitAnswer}
              style={{
                width: '100%',
                backgroundColor: colors.primary,
                borderRadius: radius.md,
                paddingVertical: spacing.md,
                alignItems: 'center',
                marginBottom: spacing.lg,
              }}
            >
              <Text style={{ color: colors.white, fontWeight: '700', fontSize: 15 }}>Verify Answer</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={{ fontSize: 14, color: colors.textLight, textAlign: 'center', marginBottom: spacing.xl, lineHeight: 20 }}>
            No security question was set up, so the PIN can&apos;t be recovered this way. Your data is safe either way{' — '}it
            stays on the device; only whoever set up the PIN can get back in.
          </Text>
        )}
        <TouchableOpacity onPress={() => setMode('pin')}>
          <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>Back to PIN</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (mode === 'reset-new' || mode === 'reset-confirm') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
        <PinEntry
          title={mode === 'reset-new' ? 'Create a new PIN' : 'Confirm your new PIN'}
          subtitle="Your data stays exactly as it is"
          error={pinError}
          resetSignal={resetSignal}
          onComplete={handleResetPinComplete}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
      <Ionicons name="lock-closed" size={40} color={colors.primary} style={{ marginBottom: spacing.xl }} />
      <PinEntry title="Enter your PIN" error={pinError} onComplete={handlePinComplete} resetSignal={resetSignal} />
      {biometricLockEnabled && (
        <TouchableOpacity
          onPress={retryBiometric}
          style={{ marginTop: spacing.xl, flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          <Ionicons name="finger-print" size={20} color={colors.primary} />
          <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>Use biometrics</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={openForgot} style={{ marginTop: spacing.lg }}>
        <Text style={{ color: colors.textLight, fontWeight: '600', fontSize: 13 }}>Forgot PIN?</Text>
      </TouchableOpacity>
    </View>
  );
}
