package expo.modules.etrackoautomation

import android.app.Notification
import android.content.pm.PackageManager
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

/**
 * Sees notifications only after the user grants Notification Access. Notifications from apps the user
 * has not enabled in Automation settings are never queued or stored; only the app's name is remembered
 * (when it looks like a transaction) so it can be offered as a source in settings.
 */
class TransactionNotificationListener : NotificationListenerService() {
  override fun onNotificationPosted(sbn: StatusBarNotification) {
    val store = AutomationStore(this)
    if (!store.isNotificationsEnabled) return

    val pkg = sbn.packageName ?: return
    if (pkg == packageName) return
    val notification = sbn.notification ?: return
    if (notification.flags and (Notification.FLAG_GROUP_SUMMARY or Notification.FLAG_ONGOING_EVENT) != 0) return

    val extras = notification.extras ?: return
    val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()
    val text = (extras.getCharSequence(Notification.EXTRA_BIG_TEXT)
      ?: extras.getCharSequence(Notification.EXTRA_TEXT))?.toString()?.trim()
    if (text.isNullOrEmpty()) return
    if (!PreFilter.looksFinancial(listOfNotNull(title, text).joinToString(" "))) return

    val appName = appLabel(pkg)
    store.rememberSeenApp(pkg, appName)
    if (!store.isPackageAllowed(pkg)) return

    if (store.enqueue("notification", pkg, appName, title, text)) {
      AutomationTaskService.start(this)
    }
  }

  private fun appLabel(pkg: String): String =
    try {
      packageManager.getApplicationLabel(packageManager.getApplicationInfo(pkg, 0)).toString()
    } catch (e: PackageManager.NameNotFoundException) {
      pkg
    }
}
