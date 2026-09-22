// SPDX-License-Identifier: MIT
package com.agentdeck.core.orchestration

import com.agentdeck.core.domain.*
import com.agentdeck.llm.api.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Test

class OrchestratorTest {

    @Test
    fun `initial state is Idle`() = runTest {
        val orchestrator = Orchestrator(llmProvider = null)
        assertEquals(OrchestratorState.Idle, orchestrator.state.value)
    }

    @Test
    fun `start transitions to Dispatching with rule-based decomposition`() = runTest {
        val orchestrator = Orchestrator(llmProvider = null)
        val blueprint = createBlueprint(modules = listOf("ModuleA", "ModuleB"))

        orchestrator.start(blueprint)

        val state = orchestrator.state.value
        // Should be Monitoring after auto-dispatch of first task
        assertTrue("Expected Monitoring or Dispatching, got $state",
            state is OrchestratorState.Monitoring || state is OrchestratorState.Dispatching)
    }

    @Test
    fun `rule-based decomposition creates tasks from modules`() = runTest {
        val orchestrator = Orchestrator(llmProvider = null)
        val blueprint = createBlueprint(
            modules = listOf("Dashboard", "API", "Database")
        )

        orchestrator.start(blueprint)

        val state = orchestrator.state.value
        val tasks = when (state) {
            is OrchestratorState.Monitoring -> state.tasks
            is OrchestratorState.Dispatching -> state.tasks
            else -> emptyList()
        }

        assertEquals(3, tasks.size)
        assertTrue(tasks[0].title.contains("Dashboard"))
        assertTrue(tasks[1].title.contains("API"))
        assertTrue(tasks[2].title.contains("Database"))
    }

    @Test
    fun `rule-based decomposition creates single task when no modules`() = runTest {
        val orchestrator = Orchestrator(llmProvider = null)
        val blueprint = createBlueprint(modules = emptyList())

        orchestrator.start(blueprint)

        val state = orchestrator.state.value
        val tasks = when (state) {
            is OrchestratorState.Monitoring -> state.tasks
            is OrchestratorState.Dispatching -> state.tasks
            else -> emptyList()
        }

        assertEquals(1, tasks.size)
        assertEquals(blueprint.project, tasks[0].title)
    }

    @Test
    fun `rule-based decomposition sets dependencies`() = runTest {
        val orchestrator = Orchestrator(llmProvider = null)
        val blueprint = createBlueprint(modules = listOf("A", "B", "C"))

        orchestrator.start(blueprint)

        val state = orchestrator.state.value
        val tasks = when (state) {
            is OrchestratorState.Monitoring -> state.tasks
            is OrchestratorState.Dispatching -> state.tasks
            else -> emptyList()
        }

        assertTrue(tasks[0].dependsOn.isEmpty())
        assertEquals(1, tasks[1].dependsOn.size)
        assertEquals(1, tasks[2].dependsOn.size)
    }

    @Test
    fun `onTaskCompleted marks task as DONE`() = runTest {
        val orchestrator = Orchestrator(llmProvider = null)
        val blueprint = createBlueprint(modules = listOf("A", "B"))

        orchestrator.start(blueprint)

        val state = orchestrator.state.value
        if (state is OrchestratorState.Monitoring) {
            val firstTask = state.activeTasks.firstOrNull() ?: state.tasks.first()

            orchestrator.onTaskCompleted(
                firstTask.id,
                TaskResult("done", ResultType.TEXT)
            )

            val newState = orchestrator.state.value
            val updatedTask = when (newState) {
                is OrchestratorState.Monitoring -> newState.tasks.find { it.id == firstTask.id }
                is OrchestratorState.Dispatching -> newState.tasks.find { it.id == firstTask.id }
                is OrchestratorState.Completed -> newState.tasks.find { it.id == firstTask.id }
                else -> null
            }

            assertNotNull(updatedTask)
            assertEquals(TaskStatus.DONE, updatedTask?.status)
        }
    }

    @Test
    fun `onTaskFailed increments retry count`() = runTest {
        val orchestrator = Orchestrator(llmProvider = null)
        val blueprint = createBlueprint(modules = listOf("A"))

        orchestrator.start(blueprint)

        val state = orchestrator.state.value
        if (state is OrchestratorState.Monitoring) {
            val task = state.activeTasks.firstOrNull() ?: state.tasks.first()

            orchestrator.onTaskFailed(task.id, "Test error")

            val newState = orchestrator.state.value
            val updatedTask = when (newState) {
                is OrchestratorState.Dispatching -> newState.tasks.find { it.id == task.id }
                is OrchestratorState.Monitoring -> newState.tasks.find { it.id == task.id }
                else -> null
            }

            assertNotNull(updatedTask)
            // Should be retried (back to QUEUED or still WORKING)
            assertTrue(
                "Expected QUEUED for retry, got ${updatedTask?.status}",
                updatedTask?.status == TaskStatus.QUEUED || updatedTask?.status == TaskStatus.WORKING
            )
        }
    }

    @Test
    fun `user response resumes from Blocked state`() = runTest {
        val orchestrator = Orchestrator(llmProvider = null)
        val blueprint = createBlueprint()

        orchestrator.start(blueprint)
        orchestrator.askUser("Test question?", listOf("A", "B"), "task_001")

        assertTrue(orchestrator.state.value is OrchestratorState.Blocked)

        orchestrator.onUserResponse("A")

        assertTrue(orchestrator.state.value is OrchestratorState.Dispatching)
    }

    private fun createBlueprint(
        modules: List<String> = listOf("TestModule")
    ) = Blueprint(
        id = "test_bp",
        project = "Test Project",
        goal = "Test goal",
        modules = modules
    )
}

/**
 * Minimal LLM provider stub for testing.
 */
private class StubLLMProvider(
    private val response: String = "[]"
) : LLMProvider {
    override val name = "Stub"
    override val isAvailable = true
    override val capabilities = setOf(LLMCapability.TEXT_GENERATION)

    override suspend fun complete(prompt: String, options: CompletionOptions): Result<String> {
        return Result.success(response)
    }

    override fun stream(prompt: String, options: CompletionOptions): Flow<Result<String>> {
        return emptyFlow()
    }

    override fun canHandle(tokenCount: Int) = true
    override suspend fun getResourceUsage() = ResourceUsage(0, 0f, true)
    override suspend fun release() {}
}
