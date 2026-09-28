package expo.modules.etrackoautomation

/**
 * Cheap native check run on every incoming SMS / allowed notification before anything is queued.
 * It is deliberately lenient (the JS parser makes the real decision); its job is only to avoid
 * waking the JS runtime for chats, delivery updates and other obviously non-financial messages.
 */
object PreFilter {
  private val currencyAmount =
    Regex("""(?i)(?:npr|nrs|rs\.?|रु|inr)\s*[:.]?\s*\d|\d[\d,]*(?:\.\d+)?\s*(?:npr|rs\b|inr)""")
  private val keyword =
    Regex("""(?i)debit|credit|paid|payment|withdraw|deposit|transfer|received|purchase|spent|a/c|account""")

  fun looksFinancial(text: String): Boolean {
    if (text.length < 10 || text.length > 2000) return false
    if (!text.any { it.isDigit() }) return false
    return currencyAmount.containsMatchIn(text) || keyword.containsMatchIn(text)
  }
}
