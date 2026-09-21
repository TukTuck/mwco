package com.agentdeck.core.common

import org.junit.Assert.*
import org.junit.Test

class RateLimiterTest {

    @Test
    fun `canMakeRequest returns true initially`() {
        val limiter = RateLimiter(maxRequestsPerMinute = 10, maxTokensPerHour = 1000)
        assertTrue(limiter.canMakeRequest())
    }

    @Test
    fun `canMakeRequest returns false after exceeding limit`() {
        val limiter = RateLimiter(maxRequestsPerMinute = 3, maxTokensPerHour = 10000)

        limiter.recordRequest()
        limiter.recordRequest()
        limiter.recordRequest()

        assertFalse(limiter.canMakeRequest())
    }

    @Test
    fun `canMakeRequest returns false after exceeding token limit`() {
        val limiter = RateLimiter(maxRequestsPerMinute = 100, maxTokensPerHour = 100)

        limiter.recordRequest(tokenCount = 50)
        limiter.recordRequest(tokenCount = 60)

        assertFalse(limiter.canMakeRequest())
    }

    @Test
    fun `getUsage reports correct counts`() {
        val limiter = RateLimiter(maxRequestsPerMinute = 10, maxTokensPerHour = 1000)

        limiter.recordRequest(tokenCount = 100)
        limiter.recordRequest(tokenCount = 200)

        val usage = limiter.getUsage()
        assertEquals(2, usage.requestsThisMinute)
        assertEquals(300, usage.tokensThisHour)
        assertEquals(10, usage.maxRequestsPerMinute)
        assertEquals(1000, usage.maxTokensPerHour)
    }

    @Test
    fun `isNearLimit returns true above 80 percent`() {
        val limiter = RateLimiter(maxRequestsPerMinute = 10, maxTokensPerHour = 1000)

        repeat(9) { limiter.recordRequest() }

        val usage = limiter.getUsage()
        assertTrue(usage.isNearLimit)
    }

    @Test
    fun `isNearLimit returns false below 80 percent`() {
        val limiter = RateLimiter(maxRequestsPerMinute = 10, maxTokensPerHour = 1000)

        repeat(5) { limiter.recordRequest() }

        val usage = limiter.getUsage()
        assertFalse(usage.isNearLimit)
    }

    @Test
    fun `getWaitTime returns 0 when under limit`() {
        val limiter = RateLimiter(maxRequestsPerMinute = 10, maxTokensPerHour = 1000)

        limiter.recordRequest()

        assertEquals(0L, limiter.getWaitTime())
    }
}
