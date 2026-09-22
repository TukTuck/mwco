// SPDX-License-Identifier: MIT
package com.agentdeck.core.orchestration

import com.agentdeck.core.domain.*

/**
 * The state machine that drives orchestration.
 *
 * ## Warum sealed class?
 * - Exhaustive when-Expressions: Compiler prüft ob alle States behandelt werden
 * - Keine invaliden States möglich (z.B. "Monitoring ohne aktive Tasks")
 * - Immutable: State-Wechsel nur durch Erzeugen eines neuen State-Objekts
 *
 * ## State-Transitions:
 * ```
 * Idle → Planning → Dispatching ←→ Monitoring → Reviewing → Completed
 *   ↑                                              ↓
 *   └──────────── Failed ←── Blocked ←─────────────┘
 * ```
 *
 * ## Wichtig:
 * Dies ist der DETERMINISTISCHE Kern – State-Transitions brauchen KEIN LLM.
 * Das LLM wird nur für "weiche" Aufgaben genutzt (Task-Formulierung, Decomposition).
 * Wenn das LLM failt → Fallback auf regelbasierte Logik, State Machine läuft weiter.
 */
sealed class OrchestratorState {
    abstract val blueprint: Blueprint?
    abstract val tasks: List<Task>
    
    data object Idle : OrchestratorState() {
        override val blueprint: Blueprint? = null
        override val tasks: List<Task> = emptyList()
    }
    
    data class Planning(
        override val blueprint: Blueprint,
        override val tasks: List<Task> = emptyList()
    ) : OrchestratorState()
    
    data class Dispatching(
        override val blueprint: Blueprint,
        override val tasks: List<Task>,
        val pendingTasks: List<Task>
    ) : OrchestratorState()
    
    data class Monitoring(
        override val blueprint: Blueprint,
        override val tasks: List<Task>,
        val activeTasks: List<Task>
    ) : OrchestratorState()
    
    data class Reviewing(
        override val blueprint: Blueprint,
        override val tasks: List<Task>,
        val completedTasks: List<Task>
    ) : OrchestratorState()
    
    data class Blocked(
        override val blueprint: Blueprint,
        override val tasks: List<Task>,
        val question: String,
        val options: List<String>,
        val blockedTaskId: String
    ) : OrchestratorState()
    
    data class Completed(
        override val blueprint: Blueprint,
        override val tasks: List<Task>,
        val summary: String
    ) : OrchestratorState()
    
    data class Failed(
        override val blueprint: Blueprint?,
        override val tasks: List<Task>,
        val error: String
    ) : OrchestratorState()
}
