// SPDX-License-Identifier: MIT
package com.agentdeck.core.domain

import kotlinx.serialization.Serializable

/**
 * An Agent is a remote or local AI service that can execute tasks.
 */
@Serializable
data class Agent(
    val id: String,
    val name: String,
    val capabilities: List<String>,
    val bestFor: List<String>,
    val status: AgentStatus = AgentStatus.ONLINE,
    val config: AgentConfig
) {
    fun canHandle(taskType: String): Boolean {
        return capabilities.any { it.equals(taskType, ignoreCase = true) } ||
               bestFor.any { it.contains(taskType, ignoreCase = true) }
    }
}

@Serializable
enum class AgentStatus {
    ONLINE,
    OFFLINE,
    RATE_LIMITED,
    ERROR
}

@Serializable
sealed class AgentConfig {
    @Serializable
    data class Arena(
        val sessionId: String? = null,
        val baseUrl: String = "https://arena.ai"
    ) : AgentConfig()
    
    @Serializable
    data class Claude(
        val apiKey: String,
        val model: String = "claude-3-5-sonnet-20241022"
    ) : AgentConfig()
    
    @Serializable
    data class ChatGPT(
        val apiKey: String,
        val model: String = "gpt-4o-mini"
    ) : AgentConfig()
    
    @Serializable
    data class WebSocket(
        val url: String,
        val authToken: String? = null
    ) : AgentConfig()
    
    @Serializable
    data class Custom(
        val endpoint: String,
        val headers: Map<String, String> = emptyMap()
    ) : AgentConfig()
}
