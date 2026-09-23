import { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { useAppStore } from '../../../src/store/useAppStore';
import {
  clearPin,
  clearSecurityQuestion,
  getSecurityQuestion,
  hasPinSet,
  hasSecurityQuestion,
  isBiometricAvailable,
  setPin,
  setSecurityQuestion,
  verifyPin,
} from '../../../src/services/authLockService';
import { spacing, radius } from '../../../src/constants/theme';
import Card from '../../../src/components/ui/Card';
import PinEntry from '../../../src/components/PinEntry';

const SECURITY_QUESTIONS = [
  "What was your first pet's name?",
  "What is your mother's maiden name?",
  'What city were you born in?',
  'What was the name of your first school?',
  'What is your favorite food?',
];

type Flow =
  | { kind: 'idle' }
  | { kind: 'setup-new' }
  | { kind: 'setup-confirm'; pin: string }
  | { kind: 'setup-question'; pin: string }
  | { kind: 'change-verify' }
  | { kind: 'change-new' }
  | { kind: 'change-confirm'; pin: string }
  | { kind: 'remove-verify' }
  | { kind: 'security-question' };

const PIN_FLOW_TITLES: Partial<Record<Flow['kind'], string>> = {
  'setup-new': 'Create a PIN',
  'setup-confirm': 'Confirm your PIN',
  'change-verify': 'Enter your current PIN',
  'change-new': 'Create a new PIN',
  'change-confirm': 'Confirm your new PIN',
  'remove-verify': 'Enter your PIN to remove it',
};

export default function SecurityScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const [pinSet, setPinSet] = useState<boolean | null>(null);
  const [questionSet, setQuestionSet] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [flow, setFlow] = useState<Flow>({ kind: 'idle' });
  const [error, setError] = useState<string | null>(null);
  const [resetSignal, setResetSignal] = useState(0);

  const [questionChoice, setQuestionChoice] = useState(SECURITY_QUESTIONS[0]);
  const [answer, setAnswer] = useState('');

  useEffect(() => {
    hasPinSet().then(setPinSet);
    hasSecurityQuestion().then(setQuestionSet);
    isBiometricAvailable().then(setBiometricAvailable);
  }, []);

  const fail = (message: string) => {
    setError(message);
    setResetSignal((n) => n + 1);
  };

  const finishPinSetup = async (pin: string) => {
    await setPin(pin);
    await updateSettings({ appLockEnabled: true });
    setPinSet(true);
    setFlow({ kind: 'idle' });
    setError(null);
    Alert.alert('PIN set', 'Your app is now protected with a PIN.');
  };

  const openSecurityQuestionFlow = async () => {
    const existing = await getSecurityQuestion();
    setQuestionChoice(existing && SECURITY_QUESTIONS.includes(existing) ? existing : SECURITY_QUESTIONS[0]);
    setAnswer('');
    setFlow({ kind: 'security-question' });
  };

  const saveSecurityQuestion = async () => {
    if (!answer.trim()) {
      Alert.alert('Missing answer', 'Enter an answer so it can be checked later.');
      return;
    }
    await setSecurityQuestion(questionChoice, answer.trim());
    setQuestionSet(true);
    if (flow.kind === 'setup-question') {
      await finishPinSetup(flow.pin);
    } else {
      setFlow({ kind: 'idle' });
      Alert.alert('Saved', 'Your security question has been saved.');
    }
  };

  const handlePinComplete = async (pin: string) => {
    switch (flow.kind) {
      case 'setup-new':
        setError(null);
        setFlow({ kind: 'setup-confirm', pin });
        return;
      case 'setup-confirm':
        if (pin !== flow.pin) {
          fail("PINs didn't match. Try again.");
          setFlow({ kind: 'setup-new' });
          return;
        }
        setError(null);
        setQuestionChoice(SECURITY_QUESTIONS[0]);
        setAnswer('');
        setFlow({ kind: 'setup-question', pin });
        return;
      case 'change-verify': {
        const ok = await verifyPin(pin);
        if (!ok) return fail('Incorrect PIN.');
        setError(null);
        setFlow({ kind: 'change-new' });
        return;
      }
      case 'change-new':
        setError(null);
        setFlow({ kind: 'change-confirm', pin });
        return;
      case 'change-confirm':
        if (pin !== flow.pin) {
          fail("PINs didn't match. Try again.");
          setFlow({ kind: 'change-new' });
          return;
        }
        await finishPinSetup(pin);
        return;
      case 'remove-verify': {
        const ok = await verifyPin(pin);
        if (!ok) return fail('Incorrect PIN.');
        await clearPin();
        await clearSecurityQuestion();
        await updateSettings({ appLockEnabled: false, biometricLockEnabled: false });
        setPinSet(false);
        setQuestionSet(false);
        setFlow({ kind: 'idle' });
        setError(null);
        return;
      }
      default:
        return;
    }
  };

  if (flow.kind === 'setup-question' || flow.kind === 'security-question') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg }}>
          <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>Security Question</Text>
          <TouchableOpacity onPress={() => (flow.kind === 'setup-question' ? finishPinSetup(flow.pin) : setFlow({ kind: 'idle' }))}>
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}>
          <Text style={{ fontSize: 12.5, color: colors.textLight, marginBottom: spacing.lg, lineHeight: 18 }}>
            If you ever forget your PIN, answering this correctly lets you set a new one without losing any of your data.
          </Text>
          <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>Choose a question</Text>
          <View style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
            {SECURITY_QUESTIONS.map((q) => (
              <TouchableOpacity
                key={q}
                onPress={() => setQuestionChoice(q)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  padding: spacing.md,
                  borderRadius: radius.md,
                  backgroundColor: questionChoice === q ? colors.primary : colors.card,
                }}
              >
                <Ionicons
                  name={questionChoice === q ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={questionChoice === q ? colors.white : colors.textLight}
                />
                <Text style={{ flex: 1, fontSize: 13.5, color: questionChoice === q ? colors.white : colors.text }}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>Your answer</Text>
          <TextInput
            value={answer}
            onChangeText={setAnswer}
            placeholder="Answer"
            placeholderTextColor={colors.textLight}
            autoCapitalize="none"
            style={{
              backgroundColor: colors.card,
              borderRadius: radius.md,
              padding: spacing.md,
              fontSize: 15,
              color: colors.text,
              marginBottom: spacing.xl,
            }}
          />
          <TouchableOpacity
            onPress={saveSecurityQuestion}
            style={{ backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' }}
          >
            <Text style={{ color: colors.white, fontWeight: '700', fontSize: 15 }}>Save</Text>
          </TouchableOpacity>
          {flow.kind === 'setup-question' && (
            <TouchableOpacity onPress={() => finishPinSetup(flow.pin)} style={{ alignItems: 'center', marginTop: spacing.lg }}>
              <Text style={{ color: colors.textLight, fontSize: 13 }}>Skip for now</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  }

  if (flow.kind !== 'idle') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: spacing.lg }}>
          <TouchableOpacity onPress={() => { setFlow({ kind: 'idle' }); setError(null); }}>
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: -60 }}>
          <PinEntry title={PIN_FLOW_TITLES[flow.kind] ?? ''} error={error} onComplete={handlePinComplete} resetSignal={resetSignal} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>PIN & Biometric Lock</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={{ padding: spacing.lg, paddingTop: 0 }}>
        {!pinSet ? (
          <Card>
            <Ionicons name="lock-closed-outline" size={28} color={colors.primary} style={{ marginBottom: spacing.sm }} />
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 4 }}>
              Lock the app with a PIN
            </Text>
            <Text style={{ fontSize: 12.5, color: colors.textLight, marginBottom: spacing.lg, lineHeight: 18 }}>
              Require a 4-digit PIN (and optionally fingerprint/face) to open Expense Tracker.
            </Text>
            <TouchableOpacity
              onPress={() => { setError(null); setFlow({ kind: 'setup-new' }); }}
              style={{ backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' }}
            >
              <Text style={{ color: colors.white, fontWeight: '700', fontSize: 15 }}>Set PIN</Text>
            </TouchableOpacity>
          </Card>
        ) : (
          <>
            <Card style={{ padding: 0, marginBottom: spacing.lg }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: spacing.lg,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}
              >
                <Ionicons name="lock-closed-outline" size={19} color={colors.text} style={{ width: 26 }} />
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={{ fontSize: 15, color: colors.text }}>Require PIN to open app</Text>
                </View>
                <TouchableOpacity onPress={() => updateSettings({ appLockEnabled: !settings.appLockEnabled })}>
                  <Ionicons
                    name={settings.appLockEnabled ? 'toggle' : 'toggle-outline'}
                    size={30}
                    color={settings.appLockEnabled ? colors.primary : colors.textLight}
                  />
                </TouchableOpacity>
              </View>

              {biometricAvailable && (
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.lg }}>
                  <Ionicons name="finger-print-outline" size={19} color={colors.text} style={{ width: 26 }} />
                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <Text style={{ fontSize: 15, color: colors.text }}>Unlock with fingerprint / face</Text>
                    <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 2 }}>PIN is always available as a backup</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => updateSettings({ biometricLockEnabled: !settings.biometricLockEnabled })}
                    disabled={!settings.appLockEnabled}
                  >
                    <Ionicons
                      name={settings.biometricLockEnabled ? 'toggle' : 'toggle-outline'}
                      size={30}
                      color={settings.biometricLockEnabled && settings.appLockEnabled ? colors.primary : colors.textLight}
                    />
                  </TouchableOpacity>
                </View>
              )}
            </Card>

            {!questionSet && (
              <Card style={{ marginBottom: spacing.lg }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
                  <Ionicons name="alert-circle-outline" size={18} color={colors.warning} />
                  <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.text, flex: 1 }}>
                    No security question set
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: colors.textLight, marginBottom: spacing.md, lineHeight: 17 }}>
                  Without one, a forgotten PIN can&apos;t be recovered.
                </Text>
                <TouchableOpacity onPress={openSecurityQuestionFlow}>
                  <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13.5 }}>Set a security question</Text>
                </TouchableOpacity>
              </Card>
            )}

            <Card style={{ padding: 0 }}>
              <TouchableOpacity
                onPress={() => { setError(null); setFlow({ kind: 'change-verify' }); }}
                style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border }}
              >
                <Ionicons name="key-outline" size={19} color={colors.text} style={{ width: 26 }} />
                <Text style={{ flex: 1, fontSize: 15, color: colors.text, marginLeft: spacing.sm }}>Change PIN</Text>
                <Ionicons name="chevron-forward" size={17} color={colors.textLight} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={openSecurityQuestionFlow}
                style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border }}
              >
                <Ionicons name="help-circle-outline" size={19} color={colors.text} style={{ width: 26 }} />
                <Text style={{ flex: 1, fontSize: 15, color: colors.text, marginLeft: spacing.sm }}>
                  {questionSet ? 'Change Security Question' : 'Set Security Question'}
                </Text>
                <Ionicons name="chevron-forward" size={17} color={colors.textLight} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setError(null); setFlow({ kind: 'remove-verify' }); }}
                style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.lg }}
              >
                <Ionicons name="trash-outline" size={19} color={colors.expense} style={{ width: 26 }} />
                <Text style={{ flex: 1, fontSize: 15, color: colors.expense, marginLeft: spacing.sm }}>Remove PIN</Text>
              </TouchableOpacity>
            </Card>
          </>
        )}
      </View>
    </View>
  );
}
