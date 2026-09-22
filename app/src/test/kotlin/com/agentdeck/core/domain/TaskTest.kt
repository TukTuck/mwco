// SPDX-License-Identifier: MIT
package com.agentdeck.core.domain

import org.junit.Assert.*
import org.junit.Test

class TaskTest {

    @Test
    fun `task isCompleted when status is DONE`() {
        val task = createTask(status = TaskStatus.DONE)
        assertTrue(task.isCompleted)
    }

    @Test
    fun `task isCompleted is false for other statuses`() {
        val statuses = listOf(
            TaskStatus.QUEUED, TaskStatus.DISPATCHING, TaskStatus.WORKING,
            TaskStatus.REVIEWING, TaskStatus.FAILED, TaskStatus.BLOCKED, TaskStatus.CANCELLED
        )
        statuses.forEach { status ->
            val task = createTask(status = status)
            assertFalse("Expected isCompleted=false for $status", task.isCompleted)
        }
    }

    @Test
    fun `task isFailed when status is FAILED`() {
        val task = createTask(status = TaskStatus.FAILED)
        assertTrue(task.isFailed)
    }

    @Test
    fun `task canRetry when retryCount less than maxRetries`() {
        val task = createTask(retryCount = 1, maxRetries = 3)
        assertTrue(task.canRetry)
    }

    @Test
    fun `task cannot retry when retryCount equals maxRetries`() {
        val task = createTask(retryCount = 3, maxRetries = 3)
        assertFalse(task.canRetry)
    }

    @Test
    fun `task cannot retry when retryCount exceeds maxRetries`() {
        val task = createTask(retryCount = 5, maxRetries = 3)
        assertFalse(task.canRetry)
    }

    private fun createTask(
        status: TaskStatus = TaskStatus.QUEUED,
        retryCount: Int = 0,
        maxRetries: Int = 3
    ) = Task(
        id = "test_task",
        title = "Test Task",
        description = "A test task",
        agentId = "test_agent",
        status = status,
        retryCount = retryCount,
        maxRetries = maxRetries
    )
}
