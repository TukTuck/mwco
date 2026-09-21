package com.agentdeck.agents

import com.agentdeck.agents.api.AgentClient
import com.agentdeck.agents.api.AgentRegistry
import com.agentdeck.agents.arena.ArenaAgentClient
import com.agentdeck.agents.chatgpt.ChatGPTAgentClient
import com.agentdeck.agents.claude.ClaudeAgentClient
import com.agentdeck.agents.websocket.WebSocketAgentClient
import com.agentdeck.core.common.SecureKeyStore
import com.agentdeck.core.domain.*

/**
 * Factory that creates and configures all available agent clients.
 *
 * ## Prinzip:
 * Liest API-Keys aus [SecureKeyStore] und erstellt nur Clients für konfigurierte Agenten.
 * Wenn kein Key vorhanden → Agent wird nicht registriert → Orchestrator kann ihn nicht nutzen.
 *
 * ## Arena-Sonderfall:
 * Arena braucht keinen API-Key (Session-basiert) → immer registriert.
 * Aber: Arena-Client ist im MVP nur ein Mock (keine echte API-Integration).
 */
object AgentClientFactory {

    /**
     * Create all available agent clients based on stored API keys.
     */
    fun createAll(keyStore: SecureKeyStore): AgentRegistry {
        val registry = AgentRegistry()

        // Claude
        val claudeKey = keyStore.getApiKey(SecureKeyStore.PROVIDER_CLAUDE)
        if (!claudeKey.isNullOrBlank()) {
            val claudeAgent = Agent(
                id = "claude_review",
                name = "Claude",
                capabilities = listOf("architecture_review", "risk_analysis", "long_context", "review", "planning"),
                bestFor = listOf("review", "planning", "UX reasoning", "architecture"),
                config = AgentConfig.Claude(apiKey = claudeKey)
            )
            registry.register(ClaudeAgentClient(claudeAgent.config as AgentConfig.Claude, claudeAgent))
        }

        // ChatGPT
        val openaiKey = keyStore.getApiKey(SecureKeyStore.PROVIDER_OPENAI)
        if (!openaiKey.isNullOrBlank()) {
            val chatgptAgent = Agent(
                id = "chatgpt_structuring",
                name = "ChatGPT",
                capabilities = listOf("json_design", "implementation_planning", "debugging", "structured_output"),
                bestFor = listOf("protocol design", "prompt generation", "structured output", "debugging"),
                config = AgentConfig.ChatGPT(apiKey = openaiKey)
            )
            registry.register(ChatGPTAgentClient(chatgptAgent.config as AgentConfig.ChatGPT, chatgptAgent))
        }

        // Arena (session-based, no API key needed for basic usage)
        val arenaAgent = Agent(
            id = "arena_main",
            name = "Arena AI",
            capabilities = listOf("coding", "file_editing", "project_execution", "testing"),
            bestFor = listOf("Android project implementation", "code changes", "repo work"),
            config = AgentConfig.Arena()
        )
        registry.register(ArenaAgentClient(arenaAgent.config as AgentConfig.Arena, arenaAgent))

        return registry
    }

    /**
     * Create a single agent client for testing.
     */
    fun createClaude(apiKey: String): AgentClient {
        val agent = Agent(
            id = "claude_test",
            name = "Claude (Test)",
            capabilities = listOf("review", "planning"),
            bestFor = listOf("test"),
            config = AgentConfig.Claude(apiKey = apiKey)
        )
        return ClaudeAgentClient(agent.config as AgentConfig.Claude, agent)
    }

    fun createChatGPT(apiKey: String): AgentClient {
        val agent = Agent(
            id = "chatgpt_test",
            name = "ChatGPT (Test)",
            capabilities = listOf("json_design", "debugging"),
            bestFor = listOf("test"),
            config = AgentConfig.ChatGPT(apiKey = apiKey)
        )
        return ChatGPTAgentClient(agent.config as AgentConfig.ChatGPT, agent)
    }

    fun createWebSocket(url: String, authToken: String? = null): AgentClient {
        val agent = Agent(
            id = "ws_bridge",
            name = "WebSocket Bridge",
            capabilities = listOf("pc_bridge", "file_access", "terminal"),
            bestFor = listOf("PC bridge", "file operations"),
            config = AgentConfig.WebSocket(url = url, authToken = authToken)
        )
        return WebSocketAgentClient(agent.config as AgentConfig.WebSocket, agent)
    }
}
