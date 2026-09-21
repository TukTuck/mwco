package com.agentdeck.agents.api

import com.agentdeck.core.domain.Agent

/**
 * Registry of available agents.
 * Manages agent clients and provides capability matching.
 */
class AgentRegistry {
    private val clients = mutableMapOf<String, AgentClient>()
    
    fun register(client: AgentClient) {
        clients[client.agent.id] = client
    }
    
    fun unregister(agentId: String) {
        clients.remove(agentId)
    }
    
    fun getClient(agentId: String): AgentClient? = clients[agentId]
    
    fun getAllAgents(): List<Agent> = clients.values.map { it.agent }
    
    fun getAvailableAgents(): List<Agent> = clients.values
        .filter { it.isConnected }
        .map { it.agent }
    
    /**
     * Find the best agent for a given task type
     */
    fun findBestAgent(capabilities: List<String>): Agent? {
        return clients.values
            .filter { it.isConnected }
            .map { it.agent }
            .maxByOrNull { agent ->
                capabilities.count { cap -> agent.canHandle(cap) }
            }
    }
    
    /**
     * Get agents as a prompt-friendly string for the LLM
     */
    fun toPromptString(): String {
        return buildString {
            appendLine("Verfügbare Agenten:")
            clients.values.forEach { client ->
                val agent = client.agent
                appendLine("- ${agent.id} (${agent.name})")
                appendLine("  Fähigkeiten: ${agent.capabilities.joinToString(", ")}")
                appendLine("  Am besten für: ${agent.bestFor.joinToString(", ")}")
                appendLine("  Status: ${agent.status}")
            }
        }
    }
}
