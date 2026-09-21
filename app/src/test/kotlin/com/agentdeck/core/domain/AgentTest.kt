package com.agentdeck.core.domain

import org.junit.Assert.*
import org.junit.Test

class AgentTest {

    @Test
    fun `canHandle matches capability case-insensitively`() {
        val agent = createAgent(capabilities = listOf("coding", "testing"))

        assertTrue(agent.canHandle("coding"))
        assertTrue(agent.canHandle("Coding"))
        assertTrue(agent.canHandle("CODING"))
        assertTrue(agent.canHandle("testing"))
    }

    @Test
    fun `canHandle returns false for unknown capability`() {
        val agent = createAgent(capabilities = listOf("coding"))

        assertFalse(agent.canHandle("design"))
        assertFalse(agent.canHandle("research"))
    }

    @Test
    fun `canHandle matches bestFor substring`() {
        val agent = createAgent(
            capabilities = emptyList(),
            bestFor = listOf("Android project implementation", "code changes")
        )

        assertTrue(agent.canHandle("Android"))
        assertTrue(agent.canHandle("code"))
        assertTrue(agent.canHandle("implementation"))
    }

    @Test
    fun `canHandle returns false for empty agent`() {
        val agent = createAgent(capabilities = emptyList(), bestFor = emptyList())

        assertFalse(agent.canHandle("anything"))
    }

    private fun createAgent(
        capabilities: List<String> = emptyList(),
        bestFor: List<String> = emptyList()
    ) = Agent(
        id = "test_agent",
        name = "Test Agent",
        capabilities = capabilities,
        bestFor = bestFor,
        config = AgentConfig.Custom(endpoint = "https://test.com")
    )
}
