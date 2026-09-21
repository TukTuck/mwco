package com.agentdeck.agents.claude

import com.agentdeck.agents.api.*
import com.agentdeck.core.domain.*
import io.ktor.client.*
import io.ktor.client.engine.android.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import timber.log.Timber

/**
 * Anthropic Claude API client.
 * Connects to Claude for architecture review, planning, and long-context tasks.
 *
 * API docs: https://docs.anthropic.com/en/api/messages
 */
class ClaudeAgentClient(
    private val config: AgentConfig.Claude,
    override val agent: Agent
) : AgentClient {

    override val isConnected: Boolean
        get() = _isConnected

    private var _isConnected = false

    private val jsonParser = Json {
        ignoreUnknownKeys = true
        isLenient = true
    }

    private val client = HttpClient(Android) {
        install(ContentNegotiation) {
            json(jsonParser)
        }
        engine {
            connectTimeout = 30_000
            socketTimeout = 180_000  // Claude can take longer for complex tasks
        }
    }

    private val baseUrl = "https://api.anthropic.com/v1"

    override suspend fun executeTask(task: Task): Result<TaskResult> {
        return try {
            val prompt = buildClaudePrompt(task)
            Timber.d("Sending task ${task.id} to Claude (${config.model})")

            val request = ClaudeMessagesRequest(
                model = config.model,
                maxTokens = 4096,
                system = "Du bist ein spezialisierter Agent in einem Multi-Agent-System. " +
                         "Arbeite nur an der zugewiesenen Aufgabe. " +
                         "Antworte präzise und strukturiert. " +
                         "Wenn Code gefragt ist, liefere vollständige, lauffähige Dateien.",
                messages = listOf(
                    ClaudeMessage(
                        role = "user",
                        content = prompt
                    )
                )
            )

            val response: HttpResponse = client.post("$baseUrl/messages") {
                header("x-api-key", config.apiKey)
                header("anthropic-version", "2023-06-01")
                contentType(ContentType.Application.Json)
                setBody(request)
            }

            if (response.status.isSuccess()) {
                val bodyText = response.bodyAsText()
                val result = jsonParser.decodeFromString<ClaudeMessagesResponse>(bodyText)
                val content = result.content.firstOrNull()?.text
                    ?: throw IllegalStateException("Empty response from Claude")

                _isConnected = true
                Timber.d("Claude response for ${task.id}: ${content.take(200)}...")

                Result.success(
                    TaskResult(
                        content = content,
                        type = if (content.contains("```") || content.contains("class ") || content.contains("fun ")) {
                            ResultType.CODE
                        } else {
                            ResultType.TEXT
                        },
                        metadata = mapOf(
                            "model" to config.model,
                            "input_tokens" to (result.usage?.inputTokens?.toString() ?: "0"),
                            "output_tokens" to (result.usage?.outputTokens?.toString() ?: "0"),
                            "stop_reason" to (result.stopReason ?: "unknown")
                        )
                    )
                )
            } else {
                val errorBody = response.bodyAsText()
                Timber.e("Claude error ${response.status}: $errorBody")

                if (response.status.value == 429) {
                    _isConnected = true  // Still connected, just rate limited
                    Result.failure(AgentRateLimitException("Claude rate limit exceeded"))
                } else {
                    _isConnected = false
                    Result.failure(Exception("Claude HTTP ${response.status.value}: $errorBody"))
                }
            }
        } catch (e: Exception) {
            Timber.e(e, "Claude request failed for task ${task.id}")
            Result.failure(e)
        }
    }

    override fun streamProgress(task: Task): Flow<AgentProgress> = flow {
        emit(AgentProgress(task.id, "sending", 10f, "Sende Task an Claude..."))
        // Note: Claude streaming would require SSE parsing similar to Nvidia NIM
        // For task execution, we use the non-streaming endpoint
        val result = executeTask(task)
        if (result.isSuccess) {
            emit(AgentProgress(task.id, "done", 100f, "Claude hat geantwortet"))
        } else {
            emit(AgentProgress(task.id, "error", 0f, result.exceptionOrNull()?.message))
        }
    }

    override suspend fun cancelTask(taskId: String): Result<Unit> {
        // Claude API doesn't support task cancellation
        Timber.w("Claude doesn't support task cancellation")
        return Result.success(Unit)
    }

    override suspend fun checkAvailability(): AgentStatus {
        return try {
            // Simple ping - try a minimal request
            val response: HttpResponse = client.post("$baseUrl/messages") {
                header("x-api-key", config.apiKey)
                header("anthropic-version", "2023-06-01")
                contentType(ContentType.Application.Json)
                setBody(ClaudeMessagesRequest(
                    model = config.model,
                    maxTokens = 1,
                    messages = listOf(ClaudeMessage("user", "Hi"))
                ))
            }

            _isConnected = response.status.isSuccess() || response.status.value == 429
            if (response.status.value == 429) AgentStatus.RATE_LIMITED
            else if (response.status.isSuccess()) AgentStatus.ONLINE
            else AgentStatus.ERROR
        } catch (e: Exception) {
            _isConnected = false
            AgentStatus.OFFLINE
        }
    }

    override suspend fun getRateLimitStatus(): RateLimitStatus {
        // Claude rate limits depend on the tier
        // Free: 10 req/min, Pro: 60 req/min, Team: 1000 req/min
        return RateLimitStatus(
            requestsRemaining = 50,  // Approximate
            tokensRemaining = 100000,
            resetTimeMillis = System.currentTimeMillis() + 60000,
            isLimited = false
        )
    }

    override suspend fun disconnect() {
        client.close()
        _isConnected = false
    }

    private fun buildClaudePrompt(task: Task): String {
        return buildString {
            appendLine("# Aufgabe: ${task.title}")
            appendLine()
            appendLine(task.description)
            appendLine()
            if (task.dependsOn.isNotEmpty()) {
                appendLine("Abhängigkeiten: ${task.dependsOn.joinToString(", ")}")
                appendLine()
            }
            appendLine("## Erwartetes Ausgabeformat")
            appendLine("Antworte strukturiert und vollständig.")
            when (task.priority) {
                Priority.CRITICAL -> appendLine("⚠️ Dies ist eine kritische Aufgabe - besonders sorgfältig arbeiten.")
                Priority.HIGH -> appendLine("Diese Aufgabe hat hohe Priorität.")
                else -> {}
            }
        }
    }
}

class AgentRateLimitException(message: String) : Exception(message)

// ── Claude API Models ──────────────────────

@Serializable
private data class ClaudeMessagesRequest(
    val model: String,
    val max_tokens: Int,
    val system: String? = null,
    val messages: List<ClaudeMessage>
)

@Serializable
private data class ClaudeMessage(
    val role: String,
    val content: String
)

@Serializable
private data class ClaudeMessagesResponse(
    val id: String = "",
    val type: String = "",
    val role: String = "",
    val content: List<ClaudeContent> = emptyList(),
    val stop_reason: String? = null,
    val usage: ClaudeUsage? = null
) {
    @kotlinx.serialization.SerialName("stop_reason")
    val stopReason: String? get() = stop_reason
}

@Serializable
private data class ClaudeContent(
    val type: String = "",
    val text: String? = null
)

@Serializable
private data class ClaudeUsage(
    @kotlinx.serialization.SerialName("input_tokens")
    val inputTokens: Int = 0,
    @kotlinx.serialization.SerialName("output_tokens")
    val outputTokens: Int = 0
)
