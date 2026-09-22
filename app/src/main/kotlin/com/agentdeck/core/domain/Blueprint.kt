// SPDX-License-Identifier: MIT
package com.agentdeck.core.domain

import kotlinx.serialization.Serializable

/**
 * A Blueprint is the master plan that drives orchestration.
 *
 * ## Woher kommt der Blueprint?
 * Der User schreibt ihn als Freitext im [com.agentdeck.ui.blueprint.BlueprintEditorScreen].
 * Der [com.agentdeck.ui.navigation.BlueprintEditorViewModel] parst den Text in diese Struktur.
 *
 * ## Warum nicht direkt JSON?
 * Freitext ist user-friendlicher. Die Struktur wird automatisch extrahiert.
 * Intern könnte man den Blueprint zu JSON normalisieren (für LLM-Kontext),
 * aber die Domain-Klasse bleibt Kotlin-first.
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
