package com.agentdeck.agents.api

import com.agentdeck.core.domain.*
import kotlinx.coroutines.flow.Flow

/**
 * Interface for communicating with remote or local agents.
 * Each agent type (Arena, Claude, ChatGPT, WebSocket) implements this.
 */
interface AgentClient {
    val agent: Agent
    val isConnected: Boolean
    
    /**
     * Send a task to the agent and get a result
     */
    suspend fun executeTask(task: Task): Result<TaskResult>
    
    /**
     * Stream progress updates from the agent
     */
    fun streamProgress(task: Task): Flow<AgentProgress>
    
    /**
     * Cancel a running task
     */
    suspend fun cancelTask(taskId: String): Result<Unit>
    
    /**
     * Check if the agent is available
     */
    suspend fun checkAvailability(): AgentStatus
    
    /**
     * Get current rate limit status
     */
    suspend fun getRateLimitStatus(): RateLimitStatus
    
    /**
     * Disconnect and release resources
     */
    suspend fun disconnect()
}

data class AgentProgress(
    val taskId: String,
    val status: String,
    val percentComplete: Float,
    val message: String? = null
)

data class RateLimitStatus(
    val requestsRemaining: Int,
    val tokensRemaining: Int,
    val resetTimeMillis: Long,
    val isLimited: Boolean
)
