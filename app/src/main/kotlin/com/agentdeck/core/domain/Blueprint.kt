package com.agentdeck.core.domain

import kotlinx.serialization.Serializable

/**
 * A Blueprint is the master plan that drives orchestration.
 * It defines the goal, constraints, modules, and preferred flow.
 */
@Serializable
data class Blueprint(
    val id: String,
    val project: String,
    val goal: String,
    val nonGoal: String? = null,
    val constraints: List<String> = emptyList(),
    val modules: List<String> = emptyList(),
    val preferredFlow: List<String> = emptyList(),
    val metadata: Map<String, String> = emptyMap()
) {
    /**
     * Convert to a compact string representation for LLM context
     */
    fun toPromptString(): String {
        return buildString {
            appendLine("Projekt: $project")
            appendLine("Ziel: $goal")
            nonGoal?.let { appendLine("Nicht-Ziel: $it") }
            
            if (constraints.isNotEmpty()) {
                appendLine("Technologie/Constraints:")
                constraints.forEach { appendLine("- $it") }
            }
            
            if (modules.isNotEmpty()) {
                appendLine("Kernmodule:")
                modules.forEachIndexed { i, m -> appendLine("${i + 1}. $m") }
            }
            
            if (preferredFlow.isNotEmpty()) {
                appendLine("Bevorzugter Ablauf:")
                appendLine(preferredFlow.joinToString(" → "))
            }
        }
    }
}
