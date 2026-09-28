/**
 * Payment apps offered in Automation settings out of the box. Any other app (bank apps, FonePay-enabled
 * wallets, ...) shows up under "Detected on this device" once it posts a transaction-like notification.
 */
export const KNOWN_PAYMENT_APPS: { packageName: string; appName: string }[] = [
  { packageName: 'com.f1soft.esewa', appName: 'eSewa' },
  { packageName: 'com.khalti', appName: 'Khalti' },
];
