// SPDX-License-Identifier: MIT
package com.agentdeck.core.domain

import kotlinx.serialization.Serializable

/**
 * A Task is a unit of work in the orchestration graph.
 *
 * ## Lifecycle:
 * ```
 * QUEUED → DISPATCHING → WORKING → REVIEWING → DONE
 *                            ↓
 *                          FAILED (mit Retry → zurück zu QUEUED)
 *                            ↓
 *                        CANCELLED
 * ```
 *
 * ## Dependencies:
 * [dependsOn] ist eine Liste von Task-IDs die vorher abgeschlossen sein müssen.
 * Der Orchestrator dispatched nur Tasks deren Dependencies alle [TaskStatus.DONE] sind.
 *
 * ## Retry:
 * Bei Failure wird [retryCount] inkrementiert. Wenn < [maxRetries] → zurück zu QUEUED.
 */
@Serializable
data class Task(
    val id: String,
    val blueprintId: String = "default",
    val title: String,
    val description: String,
    val agentId: String,
    val priority: Priority = Priority.MEDIUM,
    val status: TaskStatus = TaskStatus.QUEUED,
    val dependsOn: List<String> = emptyList(),
    val timeoutSeconds: Int = 300,
    val retryCount: Int = 0,
    val maxRetries: Int = 3,
    val result: TaskResult? = null,
    val error: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
) {
    val isCompleted: Boolean
        get() = status == TaskStatus.DONE
    
    val isFailed: Boolean
        get() = status == TaskStatus.FAILED
    
    val canRetry: Boolean
        get() = retryCount < maxRetries
}

@Serializable
enum class Priority {
    LOW, MEDIUM, HIGH, CRITICAL
}

@Serializable
enum class TaskStatus {
    QUEUED,
    DISPATCHING,
    WORKING,
    REVIEWING,
    DONE,
    FAILED,
    BLOCKED,
    CANCELLED
}

@Serializable
data class TaskResult(
    val content: String,
    val type: ResultType,
    val metadata: Map<String, String> = emptyMap()
)

@Serializable
enum class ResultType {
    CODE,
    TEXT,
    JSON,
    FILE,
    ERROR
}
