import { useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { useCurrency } from '../../../src/hooks/useCurrency';
import { useAppStore } from '../../../src/store/useAppStore';
import { titleFor } from '../../../src/automation/automationService';
import { formatFriendlyDate } from '../../../src/utils/date';
import {
  FAMILY_SUPPORT_CATEGORY_NAME,
  MONEY_RECEIVED_CATEGORY_NAME,
} from '../../../src/constants/categories';
import { spacing, radius } from '../../../src/constants/theme';
import Card from '../../../src/components/ui/Card';
import Button from '../../../src/components/ui/Button';
import EmptyState from '../../../src/components/ui/EmptyState';
import { showToast } from '../../../src/components/ui/Toast';
import type { DetectedTransaction } from '../../../src/automation/types';
import type { TransactionType } from '../../../src/types';

const TYPES: { value: TransactionType; label: string }[] = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfer' },
];

const KIND_LABEL: Record<DetectedTransaction['kind'], string> = {
  expense: 'Expense',
  income: 'Income',
  transfer: 'Transfer',
  atm_withdrawal: 'ATM withdrawal',
};

// Where a detected credit came from. Only "earned" is income in the everyday sense; the rest are
// shortcuts to the matching income category, or a transfer from one of the user's own accounts.
type CreditSource = 'earned' | 'gift' | 'someone' | 'family' | 'own';

const CREDIT_SOURCES: { value: CreditSource; label: string; icon: keyof typeof Ionicons.glyphMap; category?: string }[] = [
  { value: 'earned', label: 'Earned (salary, work…)', icon: 'briefcase-outline' },
  { value: 'someone', label: 'Someone sent it', icon: 'people-outline', category: MONEY_RECEIVED_CATEGORY_NAME },
  { value: 'gift', label: 'Gift', icon: 'gift-outline', category: 'Gift' },
  { value: 'family', label: 'Family / senior support', icon: 'home-outline', category: FAMILY_SUPPORT_CATEGORY_NAME },
  { value: 'own', label: 'From my other account', icon: 'swap-horizontal-outline' },
];

/** Keeps only digits and one decimal point, with at most two decimals. */
function sanitizeAmount(text: string): string {
  const cleaned = text.replace(/,/g, '.').replace(/[^0-9.]/g, '');
  const [whole, ...rest] = cleaned.split('.');
  if (rest.length === 0) return whole;
  return `${whole}.${rest.join('').slice(0, 2)}`;
}

function Chip({
  label,
  selected,
  onPress,
  color,
  icon,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const colors = useThemeColors();
  const active = color ?? colors.primary;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingVertical: 7,
        paddingHorizontal: 12,
        borderRadius: radius.full,
        backgroundColor: selected ? active : colors.background,
        marginRight: spacing.sm,
        marginBottom: spacing.sm,
      }}
    >
      {icon && <Ionicons name={icon} size={14} color={selected ? colors.white : colors.textLight} />}
      <Text style={{ color: selected ? colors.white : colors.text, fontWeight: '600', fontSize: 12.5 }}>{label}</Text>
    </TouchableOpacity>
  );
}

function ReviewCard({ item }: { item: DetectedTransaction }) {
  const colors = useThemeColors();
  const { format } = useCurrency();
  const accounts = useAppStore((s) => s.accounts).filter((a) => a.isActive);
  const categories = useAppStore((s) => s.categories);
  const confirmDetection = useAppStore((s) => s.confirmDetection);
  const ignoreDetection = useAppStore((s) => s.ignoreDetection);

  const cashAccount = accounts.find((a) => a.type === 'cash' && a.id !== item.accountId);
  const [type, setType] = useState<TransactionType>(
    item.kind === 'income' ? 'income' : item.kind === 'expense' ? 'expense' : 'transfer'
  );
  const [accountId, setAccountId] = useState<string | null>(item.accountId);
  const [toAccountId, setToAccountId] = useState<string | null>(
    item.kind === 'atm_withdrawal' ? (cashAccount?.id ?? null) : null
  );
  const [categoryId, setCategoryId] = useState<string | null>(item.categoryId);
  const isCredit = item.kind === 'income';
  const [source, setSource] = useState<CreditSource>(() => {
    const name = categories.find((c) => c.id === item.categoryId)?.name;
    return CREDIT_SOURCES.find((s) => s.category && s.category === name)?.value ?? 'earned';
  });
  const [ownFromId, setOwnFromId] = useState<string | null>(null); // credit from the user's own account
  const [fee, setFee] = useState('');
  const [title, setTitle] = useState(titleFor(item));
  const [rememberAccount, setRememberAccount] = useState(!item.accountId);
  const [showRaw, setShowRaw] = useState(false);
  const [busy, setBusy] = useState<'confirm' | 'ignore' | null>(null);

  const isOwnCredit = isCredit && source === 'own';
  const isTransfer = type === 'transfer' || isOwnCredit;
  const parsedFee = isTransfer ? parseFloat(fee) || 0 : 0;
  const relevantCategories = categories.filter((c) => c.isEnabled && c.kind === (type === 'income' ? 'income' : 'expense'));
  const canConfirm =
    !!accountId &&
    (isOwnCredit
      ? !!ownFromId && ownFromId !== accountId
      : type === 'transfer'
        ? !!toAccountId && toAccountId !== accountId
        : true) &&
    title.trim().length > 0;

  const chooseSource = (next: CreditSource) => {
    setSource(next);
    const def = CREDIT_SOURCES.find((s) => s.value === next);
    if (def?.category) {
      setCategoryId(categories.find((c) => c.kind === 'income' && c.name === def.category)?.id ?? null);
    } else if (next === 'earned') {
      // Let them pick Salary / Freelance / ... unless the auto-suggested one already is one of those.
      const current = categories.find((c) => c.id === categoryId)?.name;
      if (CREDIT_SOURCES.some((s) => s.category === current)) setCategoryId(null);
    }
    if (next === 'own' && title === titleFor(item)) setTitle('Transfer from my account');
    if (next !== 'own' && title === 'Transfer from my account') setTitle(titleFor(item));
  };
  const rememberLabel = item.accountHint
    ? `Always use this account for ••••${item.accountHint}`
    : `Always use this account for ${item.source === 'sms' ? item.sender : (item.channel ?? 'this app')}`;
  const amountColor = isTransfer ? colors.text : type === 'income' ? colors.income : colors.expense;

  const handleConfirm = async () => {
    if (!accountId) return;
    setBusy('confirm');
    try {
      await confirmDetection(
        item.id,
        isOwnCredit && ownFromId
          ? {
              type: 'transfer',
              accountId: ownFromId,
              toAccountId: accountId,
              categoryId: null,
              title,
              fee: parsedFee,
              detectedAccountId: accountId,
              rememberAccount,
            }
          : {
              type,
              accountId,
              toAccountId: type === 'transfer' ? toAccountId : null,
              categoryId: type === 'transfer' ? null : categoryId,
              title,
              fee: type === 'transfer' ? parsedFee : undefined,
              rememberAccount,
            }
      );
      showToast('Transaction added');
    } finally {
      setBusy(null);
    }
  };

  const handleIgnore = async () => {
    setBusy('ignore');
    try {
      await ignoreDetection(item.id);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card style={{ marginBottom: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: amountColor }}>{format(item.amount)}</Text>
          <Text style={{ fontSize: 13, color: colors.textLight, marginTop: 2 }}>
            {[KIND_LABEL[item.kind], item.channel, item.merchant].filter(Boolean).join(' · ')}
          </Text>
          <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 2 }}>
            {formatFriendlyDate(item.date)} {item.time} · {item.source === 'sms' ? `SMS from ${item.sender}` : 'App notification'}
            {item.accountHint ? ` · ••••${item.accountHint}` : ''}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setShowRaw((v) => !v)} hitSlop={8}>
          <Ionicons name={showRaw ? 'chevron-up' : 'document-text-outline'} size={19} color={colors.textLight} />
        </TouchableOpacity>
      </View>

      {showRaw && (
        <View style={{ backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md }}>
          <Text style={{ fontSize: 12.5, color: colors.textLight, lineHeight: 18 }}>{item.rawText}</Text>
        </View>
      )}

      {isCredit ? (
        <>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: spacing.sm }}>
            Where did this money come from?
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {CREDIT_SOURCES.map((s) => (
              <Chip
                key={s.value}
                label={s.label}
                icon={s.icon}
                selected={source === s.value}
                onPress={() => chooseSource(s.value)}
              />
            ))}
          </View>
        </>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {TYPES.map((t) => (
            <Chip key={t.value} label={t.label} selected={type === t.value} onPress={() => setType(t.value)} />
          ))}
        </View>
      )}

      <Text style={{ fontSize: 12, color: colors.textLight, marginTop: spacing.sm, marginBottom: spacing.xs }}>Title</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        style={{
          backgroundColor: colors.background,
          borderRadius: radius.md,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          fontSize: 14,
          color: colors.text,
          marginBottom: spacing.md,
        }}
      />

      {!isTransfer && (!isCredit || source === 'earned') && (
        <>
          <Text style={{ fontSize: 12, color: colors.textLight, marginBottom: spacing.xs }}>
            Category{item.merchant ? ` — remembered for ${item.merchant}` : ''}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.sm }}>
            {relevantCategories.map((c) => (
              <Chip key={c.id} label={c.name} color={c.color} selected={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
            ))}
          </View>
        </>
      )}

      <Text style={{ fontSize: 12, color: colors.textLight, marginBottom: spacing.xs }}>
        {isCredit ? 'Received in' : type === 'transfer' ? 'From account' : 'Account'}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.sm }}>
        {accounts.map((a) => (
          <Chip key={a.id} label={a.name} selected={accountId === a.id} onPress={() => setAccountId(a.id)} />
        ))}
      </View>

      {isOwnCredit && (
        <>
          <Text style={{ fontSize: 12, color: colors.textLight, marginBottom: spacing.xs }}>Sent from</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.sm }}>
            {accounts
              .filter((a) => a.id !== accountId)
              .map((a) => (
                <Chip key={a.id} label={a.name} selected={ownFromId === a.id} onPress={() => setOwnFromId(a.id)} />
              ))}
          </View>
        </>
      )}

      {type === 'transfer' && !isCredit && (
        <>
          <Text style={{ fontSize: 12, color: colors.textLight, marginBottom: spacing.xs }}>To account</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.sm }}>
            {accounts
              .filter((a) => a.id !== accountId)
              .map((a) => (
                <Chip key={a.id} label={a.name} selected={toAccountId === a.id} onPress={() => setToAccountId(a.id)} />
              ))}
          </View>
        </>
      )}

      {isTransfer && (
        <>
          <Text style={{ fontSize: 12, color: colors.textLight, marginBottom: spacing.xs }}>
            Service charge (paid by the sending account)
          </Text>
          <TextInput
            value={fee}
            onChangeText={(t) => setFee(sanitizeAmount(t))}
            placeholder="0"
            placeholderTextColor={colors.textLight}
            keyboardType="decimal-pad"
            style={{
              backgroundColor: colors.background,
              borderRadius: radius.md,
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.md,
              fontSize: 14,
              color: colors.text,
              marginBottom: spacing.md,
            }}
          />
        </>
      )}

      {accountId && (
        <TouchableOpacity
          onPress={() => setRememberAccount((v) => !v)}
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}
        >
          <Ionicons
            name={rememberAccount ? 'checkbox' : 'square-outline'}
            size={20}
            color={rememberAccount ? colors.primary : colors.textLight}
          />
          <Text style={{ fontSize: 13, color: colors.text, marginLeft: spacing.sm, flex: 1 }}>{rememberLabel}</Text>
        </TouchableOpacity>
      )}

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Button
          label="Ignore"
          variant="secondary"
          onPress={handleIgnore}
          loading={busy === 'ignore'}
          disabled={busy !== null}
          style={{ flex: 1, paddingVertical: spacing.sm + 2 }}
        />
        <Button
          label="Confirm"
          onPress={handleConfirm}
          loading={busy === 'confirm'}
          disabled={!canConfirm || busy !== null}
          style={{ flex: 1, paddingVertical: spacing.sm + 2 }}
        />
      </View>
    </Card>
  );
}

export default function ReviewInboxScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const pending = useAppStore((s) => s.pendingDetections);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>Needs Review</Text>
        <TouchableOpacity onPress={() => router.push('/settings/automation')}>
          <Ionicons name="options-outline" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, paddingBottom: 130 }}>
        {pending.length === 0 ? (
          <Card>
            <EmptyState
              icon="checkmark-done-outline"
              title="All caught up"
              message="Detected transactions that ETracko isn't sure about will wait here for you to confirm."
            />
          </Card>
        ) : (
          <>
            <Text style={{ fontSize: 12.5, color: colors.textLight, marginBottom: spacing.md, lineHeight: 18 }}>
              These were detected from your SMS or payment apps but need a quick check before they affect your balances.
            </Text>
            {pending.map((item) => (
              <ReviewCard key={item.id} item={item} />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}
