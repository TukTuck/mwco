package com.agentdeck.agents.api

import com.agentdeck.core.domain.*
import kotlinx.coroutines.flow.Flow

/**
 * Interface for communicating with remote or local agents.
 *
 * ## Implementierungen:
 * - [com.agentdeck.agents.claude.ClaudeAgentClient] – Anthropic Claude API
 * - [com.agentdeck.agents.chatgpt.ChatGPTAgentClient] – OpenAI ChatGPT API
 * - [com.agentdeck.agents.arena.ArenaAgentClient] – Arena AI (Mock im MVP)
 * - [com.agentdeck.agents.websocket.WebSocketAgentClient] – Generische WebSocket-Bridge
 *
 * ## Contract:
 * - [executeTask] blockiert bis der Agent fertig ist (oder Timeout)
 * - [streamProgress] liefert Live-Updates (optional, für UI)
 * - [cancelTask] ist Best-Effort (nicht alle APIs unterstützen das)
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
