export type AutomationSource = 'sms' | 'notification';

/** A raw SMS / app notification captured by the native listener and queued for parsing. */
export interface AutomationEvent {
  id: string; // unique per captured event, generated natively
  source: AutomationSource;
  sender: string; // SMS originating address, or the posting app's package name
  appName: string | null; // human-readable app label (notifications only)
  title: string | null;
  body: string;
  receivedAt: number; // epoch ms
}

export type DetectedKind = 'expense' | 'income' | 'transfer' | 'atm_withdrawal' | 'non_transaction';

export type Confidence = 'high' | 'medium' | 'low';

export interface ParsedMessage {
  kind: DetectedKind;
  amount: number | null;
  currency: string | null;
  accountHint: string | null; // trailing digits of the account/card number, e.g. '6334'
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  dateFromMessage: boolean; // false when the date fell back to the time the event arrived
  channel: string | null; // FonePay, eSewa, ATM, POS ...
  merchant: string | null; // ABC Store, Bhatbhateni ...
  reference: string | null;
  confidence: Confidence;
}

export type DetectionStatus = 'confirmed' | 'pending' | 'ignored' | 'duplicate' | 'undone';

export interface DetectedTransaction {
  id: string;
  eventId: string;
  source: AutomationSource;
  sender: string;
  rawText: string;
  kind: Exclude<DetectedKind, 'non_transaction'>;
  amount: number;
  currency: string | null;
  accountHint: string | null;
  accountId: string | null;
  channel: string | null;
  merchant: string | null;
  reference: string | null;
  date: string;
  time: string;
  receivedAt: number;
  confidence: Confidence;
  categoryId: string | null;
  status: DetectionStatus;
  transactionId: string | null;
  duplicateOf: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccountMapping {
  id: string;
  identifier: string; // 'acct:6334' | 'sender:nabil_alert' | 'app:com.f1soft.esewa'
  accountId: string;
  createdAt: string;
}

export interface MerchantRule {
  merchantKey: string;
  merchant: string;
  categoryId: string;
  updatedAt: string;
}
