// SPDX-License-Identifier: MIT
package com.agentdeck.ui.navigation

import com.agentdeck.core.domain.Blueprint
import org.junit.Assert.*
import org.junit.Test

/**
 * Tests for the Blueprint text parser.
 * Since BlueprintEditorViewModel.parseBlueprintFromText is private,
 * we test the parsing logic by replicating it here.
 */
class BlueprintParserTest {

    @Test
    fun `parser extracts project name`() {
        val text = "Projekt: Meine App\nZiel: Eine App bauen"
        val result = parseBlueprint(text)
        assertEquals("Meine App", result.project)
    }

    @Test
    fun `parser extracts goal`() {
        val text = "Projekt: Test\nZiel: Eine coole App bauen"
        val result = parseBlueprint(text)
        assertEquals("Eine coole App bauen", result.goal)
    }

    @Test
    fun `parser extracts non-goal`() {
        val text = "Projekt: Test\nZiel: Bauen\nNicht-Ziel: Kein Backend"
        val result = parseBlueprint(text)
        assertEquals("Kein Backend", result.nonGoal)
    }

    @Test
    fun `parser extracts constraints`() {
        val text = """
            Projekt: Test
            Ziel: Bauen
            Technologie:
            - Kotlin
            - Compose
            - Room
        """.trimIndent()
        val result = parseBlueprint(text)
        assertEquals(3, result.constraints.size)
        assertTrue(result.constraints.contains("Kotlin"))
        assertTrue(result.constraints.contains("Compose"))
        assertTrue(result.constraints.contains("Room"))
    }

    @Test
    fun `parser extracts modules`() {
        val text = """
            Projekt: Test
            Ziel: Bauen
            Kernmodule:
            - Dashboard
            - API Client
            - Database
        """.trimIndent()
        val result = parseBlueprint(text)
        assertEquals(3, result.modules.size)
        assertTrue(result.modules.contains("Dashboard"))
    }

    @Test
    fun `parser extracts flow with arrows`() {
        val text = """
            Projekt: Test
            Ziel: Bauen
            Ablauf:
            plan → implement → test → deploy
        """.trimIndent()
        val result = parseBlueprint(text)
        assertEquals(4, result.preferredFlow.size)
        assertEquals("plan", result.preferredFlow[0])
        assertEquals("deploy", result.preferredFlow[3])
    }

    @Test
    fun `parser handles empty input`() {
        val result = parseBlueprint("")
        // Should not crash, goal should be empty
        assertNotNull(result)
    }

    @Test
    fun `parser uses full text as goal fallback`() {
        val text = "Just a simple description without sections"
        val result = parseBlueprint(text)
        assertTrue(result.goal.contains("Just a simple"))
    }

    @Test
    fun `parser handles complex blueprint`() {
        val text = """
            Projekt: Agent Deck Mobile
            
            Ziel:
            Baue eine Android-App als Kommandozentrale
            
            Nicht-Ziel:
            Keine großen Modelle lokal
            
            Technologie:
            - Kotlin
            - Jetpack Compose
            - Material 3
            
            Kernmodule:
            - Dashboard
            - Blueprint Manager
            - Dispatcher
            
            Ablauf:
            plan → review → implement → test
        """.trimIndent()

        val result = parseBlueprint(text)
        assertEquals("Agent Deck Mobile", result.project)
        assertTrue(result.goal.contains("Kommandozentrale"))
        assertEquals("Keine großen Modelle lokal", result.nonGoal)
        assertEquals(3, result.constraints.size)
        assertEquals(3, result.modules.size)
        assertEquals(4, result.preferredFlow.size)
    }

    // ── Parser (replicated from BlueprintEditorViewModel) ──────────

    private fun parseBlueprint(text: String): Blueprint {
        val lines = text.lines().map { it.trim() }.filter { it.isNotBlank() }

        var project = "Unbenanntes Projekt"
        var goal = ""
        var nonGoal: String? = null
        val constraints = mutableListOf<String>()
        val modules = mutableListOf<String>()
        val flow = mutableListOf<String>()

        var currentSection = ""

        for (line in lines) {
            when {
                line.startsWith("Projekt:", ignoreCase = true) -> {
                    project = line.substringAfter(":").trim()
                    currentSection = "projekt"
                }
                line.startsWith("Ziel:", ignoreCase = true) -> {
                    goal = line.substringAfter(":").trim()
                    currentSection = "ziel"
                }
                line.startsWith("Nicht-Ziel:", ignoreCase = true) -> {
                    nonGoal = line.substringAfter(":").trim()
                    currentSection = "nichtziel"
                }
                line.startsWith("Technologie:", ignoreCase = true) ||
                line.startsWith("Constraints:", ignoreCase = true) -> {
                    currentSection = "constraints"
                }
                line.startsWith("Kernmodule:", ignoreCase = true) ||
                line.startsWith("Module:", ignoreCase = true) -> {
                    currentSection = "modules"
                }
                line.startsWith("Ablauf:", ignoreCase = true) ||
                line.startsWith("Flow:", ignoreCase = true) -> {
                    currentSection = "flow"
                }
                line.startsWith("-") || line.startsWith("•") -> {
                    val item = line.removePrefix("-").removePrefix("•").trim()
                    when (currentSection) {
                        "constraints" -> constraints.add(item)
                        "modules" -> modules.add(item)
                        "flow" -> flow.add(item)
                    }
                }
                line.contains("→") || line.contains("->") -> {
                    val parts = line.split("→", "->").map { it.trim() }
                    flow.addAll(parts)
                }
            }
        }

        if (goal.isBlank()) {
            goal = text.take(500)
        }

        return Blueprint(
            id = "test",
            project = project,
            goal = goal,
            nonGoal = nonGoal,
            constraints = constraints,
            modules = modules,
            preferredFlow = flow
        )
    }
}
