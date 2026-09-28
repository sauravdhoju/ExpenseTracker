package expo.modules.etrackoautomation

import android.content.Context
import android.content.Intent
import android.util.Log
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

/**
 * Runs the JS automation pipeline (src/automation/headlessTask.ts) without any UI, then stops itself.
 * Started by [SmsReceiver] / [TransactionNotificationListener] only after an event was queued.
 */
class AutomationTaskService : HeadlessJsTaskService() {
  override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig =
    HeadlessJsTaskConfig(TASK_NAME, Arguments.createMap(), TASK_TIMEOUT_MS, true)

  companion object {
    const val TASK_NAME = "ETrackoAutomation"
    private const val TASK_TIMEOUT_MS = 30_000L

    fun start(context: Context) {
      try {
        context.startService(Intent(context, AutomationTaskService::class.java))
        // Only after a successful start: the service's onDestroy is what releases this lock.
        HeadlessJsTaskService.acquireWakeLockNow(context)
      } catch (e: IllegalStateException) {
        // Android refused a background service start. The event stays queued and is processed
        // the next time an event is allowed through or when the app is opened.
        Log.w("ETrackoAutomation", "Could not start automation task; event left queued", e)
      }
    }
  }
}
