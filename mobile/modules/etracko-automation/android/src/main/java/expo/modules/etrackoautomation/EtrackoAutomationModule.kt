package expo.modules.etrackoautomation

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.provider.Settings
import android.service.notification.NotificationListenerService
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class EtrackoAutomationModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private val store: AutomationStore
    get() = AutomationStore(context)

  override fun definition() = ModuleDefinition {
    Name("EtrackoAutomation")

    Function("getQueuedEvents") { store.peekAll() }

    Function("removeQueuedEvents") { ids: List<String> -> store.remove(ids.toSet()) }

    Function("clearQueue") { store.clearQueue() }

    Function("setConfig") { enabled: Boolean, sms: Boolean, notifications: Boolean, allowedPackages: List<String> ->
      store.setConfig(enabled, sms, notifications, allowedPackages)
      if (enabled && notifications && isNotificationAccessGranted()) {
        // Ask Android to (re)connect the listener in case it was unbound while automation was off.
        NotificationListenerService.requestRebind(
          ComponentName(context, TransactionNotificationListener::class.java)
        )
      }
    }

    Function("isNotificationAccessGranted") { isNotificationAccessGranted() }

    Function("openNotificationAccessSettings") {
      val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    Function("getSeenApps") { store.seenApps() }

    Function("clearSeenApps") { store.clearSeenApps() }
  }

  private fun isNotificationAccessGranted(): Boolean {
    val enabled = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners") ?: return false
    val component = ComponentName(context, TransactionNotificationListener::class.java)
    return enabled.split(':').any { ComponentName.unflattenFromString(it) == component }
  }
}
