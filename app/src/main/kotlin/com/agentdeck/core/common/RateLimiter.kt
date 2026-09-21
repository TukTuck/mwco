package com.agentdeck.core.common

/**
 * Rate limiter to prevent API abuse and manage costs.
 *
 * ## Warum pro Instanz?
 * Jeder Agent hat eigene Rate-Limits (Claude: 50 req/min, OpenAI: variabel).
 * Deshalb wird pro Agent ein eigener [RateLimiter] erzeugt.
 *
 * ## Zwei Dimensionen:
 * - **Requests/Minute:** Schützt vor API-Bans
 * - **Tokens/Stunde:** Schützt vor Kosten-Explosion
 *
 * ## Integration:
 * Der Orchestrator prüft [canMakeRequest] BEVOR er einen Task dispatched.
 * Wenn false → [getWaitTime] sagt wann der nächste Versuch möglich ist.
 */
class RateLimiter(
    private val maxRequestsPerMinute: Int = 60,
    private val maxTokensPerHour: Int = 100000
) {
    private val requestTimestamps = mutableListOf<Long>()
    private var tokensUsedThisHour = 0
    private var hourStartTime = System.currentTimeMillis()
    
    /**
     * Check if a request is allowed
     */
    fun canMakeRequest(): Boolean {
        cleanOldTimestamps()
        resetHourIfNeeded()
        
        return requestTimestamps.size < maxRequestsPerMinute &&
               tokensUsedThisHour < maxTokensPerHour
    }
    
    /**
     * Record a request
     */
    fun recordRequest(tokenCount: Int = 0) {
        requestTimestamps.add(System.currentTimeMillis())
        tokensUsedThisHour += tokenCount
    }
    
    /**
     * Get time until next request is allowed (in milliseconds)
     */
    fun getWaitTime(): Long {
        if (canMakeRequest()) return 0
        
        cleanOldTimestamps()
        
        return if (requestTimestamps.size >= maxRequestsPerMinute) {
            // Wait until oldest request is >1 minute old
            val oldest = requestTimestamps.minOrNull() ?: return 0
            60000 - (System.currentTimeMillis() - oldest)
        } else {
            // Wait until next hour
            3600000 - (System.currentTimeMillis() - hourStartTime)
        }
    }
    
    /**
     * Get current usage stats
     */
    fun getUsage(): RateLimitUsage {
        cleanOldTimestamps()
        resetHourIfNeeded()
        
        return RateLimitUsage(
            requestsThisMinute = requestTimestamps.size,
            maxRequestsPerMinute = maxRequestsPerMinute,
            tokensThisHour = tokensUsedThisHour,
            maxTokensPerHour = maxTokensPerHour
        )
    }
    
    private fun cleanOldTimestamps() {
        val cutoff = System.currentTimeMillis() - 60000
        requestTimestamps.removeAll { it < cutoff }
    }
    
    private fun resetHourIfNeeded() {
        if (System.currentTimeMillis() - hourStartTime > 3600000) {
            tokensUsedThisHour = 0
            hourStartTime = System.currentTimeMillis()
        }
    }
}

data class RateLimitUsage(
    val requestsThisMinute: Int,
    val maxRequestsPerMinute: Int,
    val tokensThisHour: Int,
    val maxTokensPerHour: Int
) {
    val requestPercent: Float
        get() = requestsThisMinute.toFloat() / maxRequestsPerMinute
    
    val tokenPercent: Float
        get() = tokensThisHour.toFloat() / maxTokensPerHour
    
    val isNearLimit: Boolean
        get() = requestPercent > 0.8f || tokenPercent > 0.8f
}
