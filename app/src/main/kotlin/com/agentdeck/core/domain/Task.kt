package com.agentdeck.core.domain

import kotlinx.serialization.Serializable

/**
 * A Task is a unit of work in the orchestration graph.
 */
@Serializable
data class Task(
    val id: String,
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
