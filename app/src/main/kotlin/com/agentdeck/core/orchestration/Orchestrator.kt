package com.agentdeck.core.orchestration

import com.agentdeck.core.domain.*
import com.agentdeck.llm.api.CompletionOptions
import com.agentdeck.llm.api.LLMProvider
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import timber.log.Timber
import java.util.UUID

/**
 * The main Orchestrator that manages the state machine and coordinates agents.
 * Uses a hybrid approach: deterministic state machine + optional LLM for soft logic.
 */
class Orchestrator(
    private val llmProvider: LLMProvider?,
    private val agentClients: Map<String, com.agentdeck.agents.api.AgentClient> = emptyMap()
) {
    private val json = Json { 
        ignoreUnknownKeys = true
        isLenient = true
    }
    
    private val _state = MutableStateFlow<OrchestratorState>(OrchestratorState.Idle)
    val state: StateFlow<OrchestratorState> = _state.asStateFlow()
    
    /**
     * Start orchestration with a blueprint
     */
    suspend fun start(blueprint: Blueprint) {
        Timber.d("Starting orchestration for: ${blueprint.project}")
        
        _state.value = OrchestratorState.Planning(blueprint)
        
        // Decompose blueprint into tasks
        val tasks = decomposeIntoTasks(blueprint)
        Timber.d("Decomposed into ${tasks.size} tasks")
        
        _state.value = OrchestratorState.Dispatching(
            blueprint = blueprint,
            tasks = tasks,
            pendingTasks = tasks.filter { it.status == TaskStatus.QUEUED }
        )
        
        // Auto-dispatch first tasks
        dispatchNext()
    }
    
    /**
     * Decompose a blueprint into executable tasks.
     * Uses LLM if available, otherwise falls back to rule-based decomposition.
     */
    private suspend fun decomposeIntoTasks(blueprint: Blueprint): List<Task> {
        return if (llmProvider != null && llmProvider.isAvailable) {
            decomposeWithLLM(blueprint)
        } else {
            decomposeWithRules(blueprint)
        }
    }
    
    private suspend fun decomposeWithLLM(blueprint: Blueprint): List<Task> {
        val agentsList = agentClients.values.map { it.agent }
        
        val prompt = """
            Zerlege diesen Blueprint in kleine, ausführbare Tasks.
            
            ${blueprint.toPromptString()}
            
            Verfügbare Agenten:
            ${agentsList.joinToString("\n") { "- ${it.id}: ${it.capabilities.joinToString(", ")}" }}
            
            Gib eine JSON-Liste von Tasks zurück. Format:
            [
              {
                "id": "task_001",
                "title": "Kurzer Titel",
                "description": "Detaillierte Beschreibung der Aufgabe",
                "agentId": "agent_id",
                "priority": "HIGH",
                "dependsOn": []
              }
            ]
            
            Regeln:
            - Verwende nur Agent-IDs aus der Liste oben
            - Priority: HIGH, MEDIUM, oder LOW
            - dependsOn: Liste von Task-IDs die vorher fertig sein müssen
            - Halte Tasks klein und spezifisch
            - Maximal 10 Tasks
            
            Antworte NUR mit dem JSON-Array, keine Erklärung.
        """.trimIndent()
        
        val result = llmProvider.complete(
            prompt = prompt,
            options = CompletionOptions(
                temperature = 0.3f,
                maxTokens = 2048,
                systemPrompt = "Du bist ein Task-Planer. Antworte nur mit gültigem JSON."
            )
        )
        
        return result.fold(
            onSuccess = { response ->
                Timber.d("LLM response: $response")
                parseTasksFromJSON(response, blueprint)
            },
            onFailure = { error ->
                Timber.w(error, "LLM decomposition failed, falling back to rules")
                decomposeWithRules(blueprint)
            }
        )
    }
    
    @Serializable
    private data class LLMTasksResponse(
        val tasks: List<LLMTask> = emptyList()
    )
    
    @Serializable
    private data class LLMTask(
        val id: String = "",
        val title: String = "",
        val description: String = "",
        val agentId: String = "",
        val priority: String = "MEDIUM",
        val dependsOn: List<String> = emptyList()
    )
    
    private fun parseTasksFromJSON(jsonString: String, blueprint: Blueprint): List<Task> {
        return try {
            // Clean up the response - extract JSON array if wrapped
            val cleanedJson = jsonString
                .trim()
                .removePrefix("```json")
                .removePrefix("```")
                .removeSuffix("```")
                .trim()
            
            // Try parsing as direct array
            val llmTasks: List<LLMTask> = json.decodeFromString(cleanedJson)
            
            llmTasks.map { llmTask ->
                Task(
                    id = llmTask.id.ifBlank { UUID.randomUUID().toString().take(8) },
                    title = llmTask.title,
                    description = llmTask.description,
                    agentId = llmTask.agentId.ifBlank { agentClients.keys.firstOrNull() ?: "unknown" },
                    priority = try { Priority.valueOf(llmTask.priority.uppercase()) } catch (e: Exception) { Priority.MEDIUM },
                    dependsOn = llmTask.dependsOn
                )
            }
        } catch (e: Exception) {
            Timber.w(e, "Failed to parse LLM JSON output, falling back to rules")
            decomposeWithRules(blueprint)
        }
    }
    
    private fun decomposeWithRules(blueprint: Blueprint): List<Task> {
        val defaultAgent = agentClients.keys.firstOrNull() ?: "unknown"
        
        return if (blueprint.modules.isNotEmpty()) {
            blueprint.modules.mapIndexed { index, module ->
                Task(
                    id = "task_${String.format("%03d", index + 1)}",
                    title = "Implementiere $module",
                    description = "Erstelle das Modul $module gemäß Blueprint-Spezifikation.\n\nBlueprint-Kontext:\n${blueprint.goal}",
                    agentId = selectAgentForModule(module, defaultAgent),
                    priority = if (index == 0) Priority.HIGH else Priority.MEDIUM,
                    dependsOn = if (index > 0) listOf("task_${String.format("%03d", index)}") else emptyList()
                )
            }
        } else {
            // If no modules defined, create a single task from the goal
            listOf(
                Task(
                    id = "task_001",
                    title = blueprint.project,
                    description = blueprint.goal,
                    agentId = defaultAgent,
                    priority = Priority.HIGH
                )
            )
        }
    }
    
    private fun selectAgentForModule(module: String, defaultAgent: String): String {
        return agentClients.values
            .firstOrNull { client ->
                client.agent.capabilities.any { cap ->
                    module.contains(cap, ignoreCase = true)
                } || client.agent.bestFor.any { best ->
                    module.contains(best, ignoreCase = true)
                }
            }
            ?.agent?.id
            ?: defaultAgent
    }
    
    /**
     * Dispatch the next available task
     */
    suspend fun dispatchNext() {
        val currentState = _state.value
        
        val (blueprint, allTasks) = when (currentState) {
            is OrchestratorState.Dispatching -> currentState.blueprint to currentState.tasks
            is OrchestratorState.Monitoring -> currentState.blueprint to currentState.tasks
            else -> return
        }
        
        // Find tasks whose dependencies are all satisfied
        val readyTasks = allTasks.filter { task ->
            task.status == TaskStatus.QUEUED &&
            task.dependsOn.all { depId ->
                allTasks.any { it.id == depId && it.isCompleted }
            }
        }.sortedBy { it.priority.ordinal }
        
        if (readyTasks.isEmpty()) {
            // Check if all tasks are done
            if (allTasks.all { it.isCompleted }) {
                _state.value = OrchestratorState.Completed(
                    blueprint = blueprint,
                    tasks = allTasks,
                    summary = "Alle ${allTasks.size} Tasks erfolgreich abgeschlossen."
                )
            } else if (allTasks.all { it.isCompleted || it.isFailed }) {
                val failed = allTasks.count { it.isFailed }
                _state.value = OrchestratorState.Completed(
                    blueprint = blueprint,
                    tasks = allTasks,
                    summary = "${allTasks.count { it.isCompleted }} Tasks fertig, $failed fehlgeschlagen."
                )
            }
            return
        }
        
        // Dispatch all ready tasks (parallel execution)
        val updatedTasks = allTasks.map { task ->
            if (task in readyTasks) task.copy(status = TaskStatus.WORKING, updatedAt = System.currentTimeMillis())
            else task
        }
        
        _state.value = OrchestratorState.Monitoring(
            blueprint = blueprint,
            tasks = updatedTasks,
            activeTasks = readyTasks.map { it.copy(status = TaskStatus.WORKING) }
        )
        
        // Actually dispatch to agents
        readyTasks.forEach { task ->
            dispatchToAgent(task)
        }
    }
    
    private suspend fun dispatchToAgent(task: Task) {
        val agentClient = agentClients[task.agentId]
        
        if (agentClient == null) {
            Timber.w("No agent client found for: ${task.agentId}")
            onTaskFailed(task.id, "Agent ${task.agentId} nicht verfügbar")
            return
        }
        
        try {
            Timber.d("Dispatching task ${task.id} to ${task.agentId}")
            
            val result = agentClient.executeTask(task)
            
            result.fold(
                onSuccess = { taskResult ->
                    onTaskCompleted(task.id, taskResult)
                },
                onFailure = { error ->
                    onTaskFailed(task.id, error.message ?: "Unknown error")
                }
            )
        } catch (e: Exception) {
            Timber.e(e, "Error dispatching task ${task.id}")
            onTaskFailed(task.id, e.message ?: "Dispatch error")
        }
    }
    
    /**
     * Handle task completion
     */
    fun onTaskCompleted(taskId: String, result: TaskResult) {
        val currentState = _state.value
        
        if (currentState !is OrchestratorState.Monitoring) return
        
        val updatedTasks = currentState.tasks.map {
            if (it.id == taskId) {
                it.copy(
                    status = TaskStatus.DONE,
                    result = result,
                    updatedAt = System.currentTimeMillis()
                )
            } else it
        }
        
        val remainingActive = currentState.activeTasks.filter { it.id != taskId }
        
        Timber.d("Task $taskId completed. ${remainingActive.size} still active.")
        
        _state.value = OrchestratorState.Monitoring(
            blueprint = currentState.blueprint,
            tasks = updatedTasks,
            activeTasks = remainingActive
        )
    }
    
    /**
     * Handle task failure
     */
    fun onTaskFailed(taskId: String, error: String) {
        val currentState = _state.value
        
        if (currentState !is OrchestratorState.Monitoring) return
        
        val failedTask = currentState.tasks.find { it.id == taskId } ?: return
        
        if (failedTask.canRetry) {
            Timber.w("Task $taskId failed, retrying (${failedTask.retryCount + 1}/${failedTask.maxRetries}): $error")
            
            val updatedTask = failedTask.copy(
                status = TaskStatus.QUEUED,
                retryCount = failedTask.retryCount + 1,
                error = error,
                updatedAt = System.currentTimeMillis()
            )
            
            val updatedTasks = currentState.tasks.map {
                if (it.id == taskId) updatedTask else it
            }
            
            _state.value = OrchestratorState.Dispatching(
                blueprint = currentState.blueprint,
                tasks = updatedTasks,
                pendingTasks = updatedTasks.filter { it.status == TaskStatus.QUEUED }
            )
        } else {
            Timber.e("Task $taskId failed permanently: $error")
            
            val updatedTask = failedTask.copy(
                status = TaskStatus.FAILED,
                error = error,
                updatedAt = System.currentTimeMillis()
            )
            
            val updatedTasks = currentState.tasks.map {
                if (it.id == taskId) updatedTask else it
            }
            
            _state.value = OrchestratorState.Monitoring(
                blueprint = currentState.blueprint,
                tasks = updatedTasks,
                activeTasks = currentState.activeTasks.filter { it.id != taskId }
            )
        }
    }
    
    /**
     * Ask user for input when blocked
     */
    fun askUser(question: String, options: List<String>, blockedTaskId: String) {
        val currentState = _state.value
        
        _state.value = OrchestratorState.Blocked(
            blueprint = currentState.blueprint ?: return,
            tasks = currentState.tasks,
            question = question,
            options = options,
            blockedTaskId = blockedTaskId
        )
    }
    
    /**
     * Resume after user input
     */
    fun onUserResponse(response: String) {
        val currentState = _state.value
        
        if (currentState !is OrchestratorState.Blocked) return
        
        Timber.d("User responded: $response")
        
        _state.value = OrchestratorState.Dispatching(
            blueprint = currentState.blueprint,
            tasks = currentState.tasks,
            pendingTasks = currentState.tasks.filter { it.status == TaskStatus.QUEUED }
        )
    }
}
