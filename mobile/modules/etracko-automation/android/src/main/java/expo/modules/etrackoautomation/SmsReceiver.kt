package expo.modules.etrackoautomation

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony

/** Receives incoming SMS, keeps only transaction-looking ones, queues them and wakes the JS task. */
class SmsReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
    val store = AutomationStore(context)
    if (!store.isSmsEnabled) return

    val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
    // A long SMS arrives as several parts; stitch them back together per sender.
    val bodies = LinkedHashMap<String, StringBuilder>()
    for (message in messages) {
      val sender = message.displayOriginatingAddress ?: message.originatingAddress ?: continue
      bodies.getOrPut(sender) { StringBuilder() }.append(message.displayMessageBody ?: message.messageBody ?: "")
    }

    var queued = false
    for ((sender, builder) in bodies) {
      val body = builder.toString().trim()
      if (!PreFilter.looksFinancial(body)) continue
      if (store.enqueue("sms", sender, null, null, body)) queued = true
    }
    if (queued) AutomationTaskService.start(context)
  }
}
