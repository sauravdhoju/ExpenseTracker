package expo.modules.etrackoautomation

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

/**
 * Tiny on-device store shared by the native listeners and the JS module:
 *  - the automation config mirrored from JS settings (so listeners can bail out without starting JS),
 *  - a persistent queue of captured events waiting to be parsed (survives process death),
 *  - the list of apps seen posting transaction-like notifications (package + label only).
 */
class AutomationStore(context: Context) {
  private val prefs: SharedPreferences =
    context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

  // ---- Config -------------------------------------------------------------------------------

  val isEnabled: Boolean get() = prefs.getBoolean(KEY_ENABLED, false)
  val isSmsEnabled: Boolean get() = isEnabled && prefs.getBoolean(KEY_SMS, false)
  val isNotificationsEnabled: Boolean get() = isEnabled && prefs.getBoolean(KEY_NOTIFICATIONS, false)

  fun isPackageAllowed(packageName: String): Boolean =
    prefs.getStringSet(KEY_ALLOWED_PACKAGES, emptySet())?.contains(packageName) == true

  fun setConfig(enabled: Boolean, sms: Boolean, notifications: Boolean, allowedPackages: List<String>) {
    prefs.edit()
      .putBoolean(KEY_ENABLED, enabled)
      .putBoolean(KEY_SMS, sms)
      .putBoolean(KEY_NOTIFICATIONS, notifications)
      .putStringSet(KEY_ALLOWED_PACKAGES, allowedPackages.toSet())
      .apply()
  }

  // ---- Event queue --------------------------------------------------------------------------

  /** Returns false when the event was dropped as a repeat of the previous one (apps often re-post). */
  fun enqueue(source: String, sender: String, appName: String?, title: String?, body: String): Boolean =
    synchronized(LOCK) {
      val now = System.currentTimeMillis()
      val fingerprint = "$source|$sender|$title|$body"
      if (prefs.getString(KEY_LAST_FINGERPRINT, null) == fingerprint &&
        now - prefs.getLong(KEY_LAST_FINGERPRINT_AT, 0L) < REPEAT_WINDOW_MS
      ) {
        return false
      }

      val queue = readQueue()
      queue.put(
        JSONObject()
          .put("id", UUID.randomUUID().toString())
          .put("source", source)
          .put("sender", sender)
          .put("appName", appName ?: JSONObject.NULL)
          .put("title", title ?: JSONObject.NULL)
          .put("body", body)
          .put("receivedAt", now)
      )
      // Bounded so a misbehaving app can never grow storage without limit.
      while (queue.length() > MAX_QUEUE) queue.remove(0)
      prefs.edit()
        .putString(KEY_QUEUE, queue.toString())
        .putString(KEY_LAST_FINGERPRINT, fingerprint)
        .putLong(KEY_LAST_FINGERPRINT_AT, now)
        .commit()
      true
    }

  fun peekAll(): List<Map<String, Any?>> = synchronized(LOCK) {
    val queue = readQueue()
    (0 until queue.length()).map { i ->
      val o = queue.getJSONObject(i)
      mapOf(
        "id" to o.getString("id"),
        "source" to o.getString("source"),
        "sender" to o.getString("sender"),
        "appName" to o.optStringOrNull("appName"),
        "title" to o.optStringOrNull("title"),
        "body" to o.getString("body"),
        "receivedAt" to o.getLong("receivedAt").toDouble(),
      )
    }
  }

  fun remove(ids: Set<String>) = synchronized(LOCK) {
    val queue = readQueue()
    val kept = JSONArray()
    for (i in 0 until queue.length()) {
      val o = queue.getJSONObject(i)
      if (o.getString("id") !in ids) kept.put(o)
    }
    prefs.edit().putString(KEY_QUEUE, kept.toString()).commit()
  }

  fun clearQueue() = synchronized(LOCK) {
    prefs.edit().remove(KEY_QUEUE).remove(KEY_LAST_FINGERPRINT).remove(KEY_LAST_FINGERPRINT_AT).commit()
  }

  private fun readQueue(): JSONArray =
    try {
      JSONArray(prefs.getString(KEY_QUEUE, "[]"))
    } catch (e: Exception) {
      JSONArray()
    }

  // ---- Seen apps ----------------------------------------------------------------------------

  fun rememberSeenApp(packageName: String, appName: String) = synchronized(LOCK) {
    val seen = readSeen()
    if (seen.optString(packageName) == appName) return@synchronized
    seen.put(packageName, appName)
    prefs.edit().putString(KEY_SEEN_APPS, seen.toString()).apply()
  }

  fun seenApps(): List<Map<String, String>> = synchronized(LOCK) {
    val seen = readSeen()
    seen.keys().asSequence().map { mapOf("packageName" to it, "appName" to seen.getString(it)) }.toList()
  }

  fun clearSeenApps() = synchronized(LOCK) {
    prefs.edit().remove(KEY_SEEN_APPS).apply()
  }

  private fun readSeen(): JSONObject =
    try {
      JSONObject(prefs.getString(KEY_SEEN_APPS, "{}"))
    } catch (e: Exception) {
      JSONObject()
    }

  private fun JSONObject.optStringOrNull(key: String): String? =
    if (isNull(key)) null else optString(key)

  companion object {
    private val LOCK = Any()
    private const val PREFS_NAME = "etracko_automation"
    private const val KEY_ENABLED = "enabled"
    private const val KEY_SMS = "sms"
    private const val KEY_NOTIFICATIONS = "notifications"
    private const val KEY_ALLOWED_PACKAGES = "allowed_packages"
    private const val KEY_QUEUE = "queue"
    private const val KEY_SEEN_APPS = "seen_apps"
    private const val KEY_LAST_FINGERPRINT = "last_fingerprint"
    private const val KEY_LAST_FINGERPRINT_AT = "last_fingerprint_at"
    private const val MAX_QUEUE = 200
    private const val REPEAT_WINDOW_MS = 60_000L
  }
}
