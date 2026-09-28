import Constants from 'expo-constants';

/** Single place for the About screen's content — edit here, not in the screen. */
export const APP_INFO = {
  name: 'ETracko',
  tagline: 'Your money. Your phone. Your data.',
  version: Constants.expoConfig?.version ?? '1.0.0',
  description:
    'ETracko is a private, offline-first expense tracker. Track spending, budgets, bills, goals and money you lent — ' +
    'and let bank SMS and payment-app notifications add transactions for you, without anything leaving your phone.',
};

export const DEVELOPER = {
  name: 'Saurav Dhoju',
  role: 'Designer & Developer',
  initials: 'SD',
  bio: 'Built ETracko as a college project to make personal finance tracking effortless, private and local-first.',
  email: 'sauravdhoju12@gmail.com',
};

export const PRINCIPLES: { icon: string; title: string; text: string }[] = [
  { icon: 'lock-closed-outline', title: 'Private', text: 'No account, no ETracko server.' },
  { icon: 'cloud-offline-outline', title: 'Offline-first', text: 'Everything works without internet.' },
  { icon: 'flash-outline', title: 'Automatic', text: 'Transactions detected from SMS & apps.' },
  { icon: 'hand-left-outline', title: 'In your control', text: 'Every automation can be turned off.' },
];

export const FEATURES: string[] = [
  'Income, expense and transfer tracking across multiple accounts',
  'Automatic detection from bank SMS and payment-app notifications',
  'Monthly budgets with alerts',
  'Bills, recurring transactions and reminders',
  'Savings goals, lent money and forgotten-money tracking',
  'Reports and spending insights',
  'AD and BS (Nepali) calendar support',
  'PIN / biometric lock and JSON / CSV export',
];

export const FAQ: { q: string; a: string }[] = [
  {
    q: 'Does ETracko upload my SMS or transactions?',
    a: 'No. Messages are parsed on your phone and stored in a local database. The only thing that ever leaves the device is the optional Google Drive backup, and only if you turn it on.',
  },
  {
    q: 'Why was a transaction not detected?',
    a: 'Check that Automation is on, the source (Bank SMS or the app) is enabled, and permissions are granted. Messages ETracko is unsure about wait in the Review Inbox.',
  },
  {
    q: 'How do I stop duplicate entries?',
    a: 'ETracko already merges the bank SMS and the app notification for the same payment. If one slips through, delete it — its balance effect is reversed.',
  },
  {
    q: 'How do I move my data to a new phone?',
    a: 'Use Settings → Privacy → Export Data, then Import Backup on the new phone (or use Cloud Backup).',
  },
];

export const BUILT_WITH = ['React Native', 'Expo', 'SQLite', 'Zustand', 'Kotlin'];
