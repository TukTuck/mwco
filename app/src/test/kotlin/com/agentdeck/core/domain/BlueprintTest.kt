package com.agentdeck.core.domain

import org.junit.Assert.*
import org.junit.Test

class BlueprintTest {

    @Test
    fun `toPromptString includes all sections`() {
        val blueprint = Blueprint(
            id = "bp_001",
            project = "Test Project",
            goal = "Build a test app",
            nonGoal = "Not a production app",
            constraints = listOf("Kotlin", "Compose"),
            modules = listOf("Dashboard", "API"),
            preferredFlow = listOf("plan", "implement", "test")
        )

        val prompt = blueprint.toPromptString()

        assertTrue(prompt.contains("Test Project"))
        assertTrue(prompt.contains("Build a test app"))
        assertTrue(prompt.contains("Not a production app"))
        assertTrue(prompt.contains("Kotlin"))
        assertTrue(prompt.contains("Compose"))
        assertTrue(prompt.contains("Dashboard"))
        assertTrue(prompt.contains("API"))
        assertTrue(prompt.contains("plan"))
    }

    @Test
    fun `toPromptString handles null nonGoal`() {
        val blueprint = Blueprint(
            id = "bp_002",
            project = "Test",
            goal = "Test goal",
            nonGoal = null
        )

        val prompt = blueprint.toPromptString()
        assertFalse(prompt.contains("Nicht-Ziel"))
    }

    @Test
    fun `toPromptString handles empty lists`() {
        val blueprint = Blueprint(
            id = "bp_003",
            project = "Minimal",
            goal = "Minimal goal"
        )

        val prompt = blueprint.toPromptString()
        assertTrue(prompt.contains("Minimal"))
        assertTrue(prompt.contains("Minimal goal"))
    }
}
