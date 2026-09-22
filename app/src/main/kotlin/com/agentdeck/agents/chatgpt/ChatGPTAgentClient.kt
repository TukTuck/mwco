// SPDX-License-Identifier: MIT
package com.agentdeck.agents.chatgpt

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
 * OpenAI ChatGPT agent client.
 * Connects to GPT-4o / GPT-4o-mini for JSON design, debugging, structured output.
 */
class ChatGPTAgentClient(
    private val config: AgentConfig.ChatGPT,
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
            socketTimeout = 120_000
        }
    }

    private val baseUrl = "https://api.openai.com/v1"

    override suspend fun executeTask(task: Task): Result<TaskResult> {
        return try {
            val prompt = buildChatGPTPrompt(task)
            Timber.d("Sending task ${task.id} to ChatGPT (${config.model})")

            val request = OpenAIChatRequest(
                model = config.model,
                messages = listOf(
                    OpenAIMessage(
                        role = "system",
                        content = "Du bist ein spezialisierter Agent in einem Multi-Agent-System. " +
                                  "Arbeite nur an der zugewiesenen Aufgabe. " +
                                  "Wenn JSON gefragt ist, liefere gültiges JSON ohne Markdown-Wrapper. " +
                                  "Wenn Code gefragt ist, liefere vollständige Dateien."
                    ),
                    OpenAIMessage(role = "user", content = prompt)
                ),
                temperature = 0.3f,
                maxTokens = 4096
            )

            val response: HttpResponse = client.post("$baseUrl/chat/completions") {
                header("Authorization", "Bearer ${config.apiKey}")
                contentType(ContentType.Application.Json)
                setBody(request)
            }

            if (response.status.isSuccess()) {
                val bodyText = response.bodyAsText()
                val result = jsonParser.decodeFromString<OpenAIChatResponse>(bodyText)
                val content = result.choices.firstOrNull()?.message?.content
                    ?: throw IllegalStateException("Empty response from ChatGPT")

                _isConnected = true
                Timber.d("ChatGPT response for ${task.id}: ${content.take(200)}...")

                Result.success(
                    TaskResult(
                        content = content,
                        type = detectResultType(content),
                        metadata = mapOf(
                            "model" to config.model,
                            "tokens" to (result.usage?.totalTokens?.toString() ?: "0"),
                            "finish_reason" to (result.choices.firstOrNull()?.finishReason ?: "unknown")
                        )
                    )
                )
            } else {
                val errorBody = response.bodyAsText()
                Timber.e("ChatGPT error ${response.status}: $errorBody")

                if (response.status.value == 429) {
                    Result.failure(Exception("ChatGPT rate limit exceeded"))
                } else {
                    _isConnected = false
                    Result.failure(Exception("ChatGPT HTTP ${response.status.value}: $errorBody"))
                }
            }
        } catch (e: Exception) {
            Timber.e(e, "ChatGPT request failed for task ${task.id}")
            Result.failure(e)
        }
    }

    override fun streamProgress(task: Task): Flow<AgentProgress> = flow {
        emit(AgentProgress(task.id, "sending", 10f, "Sende Task an ChatGPT..."))
        val result = executeTask(task)
        if (result.isSuccess) {
            emit(AgentProgress(task.id, "done", 100f, "ChatGPT hat geantwortet"))
        } else {
            emit(AgentProgress(task.id, "error", 0f, result.exceptionOrNull()?.message))
        }
    }

    override suspend fun cancelTask(taskId: String): Result<Unit> {
        return Result.success(Unit)
    }

    override suspend fun checkAvailability(): AgentStatus {
        return try {
            val response: HttpResponse = client.get("$baseUrl/models") {
                header("Authorization", "Bearer ${config.apiKey}")
            }
            _isConnected = response.status.isSuccess()
            if (response.status.isSuccess()) AgentStatus.ONLINE else AgentStatus.ERROR
        } catch (e: Exception) {
            _isConnected = false
            AgentStatus.OFFLINE
        }
    }

    override suspend fun getRateLimitStatus(): RateLimitStatus {
        return RateLimitStatus(
            requestsRemaining = 500,
            tokensRemaining = 500000,
            resetTimeMillis = System.currentTimeMillis() + 60000,
            isLimited = false
        )
    }

    override suspend fun disconnect() {
        client.close()
        _isConnected = false
    }

    private fun buildChatGPTPrompt(task: Task): String {
        return buildString {
            appendLine("# Aufgabe: ${task.title}")
            appendLine()
            appendLine(task.description)
            appendLine()
            appendLine("Antworte strukturiert und vollständig. Keine Platzhalter.")
        }
    }

    private fun detectResultType(content: String): ResultType {
        return when {
            content.trimStart().startsWith("{") || content.trimStart().startsWith("[") -> ResultType.JSON
            content.contains("```kotlin") || content.contains("```java") -> ResultType.CODE
            content.contains("class ") && content.contains("fun ") -> ResultType.CODE
            else -> ResultType.TEXT
        }
    }
}

// ── OpenAI API Models ──────────────────────

@Serializable
private data class OpenAIChatRequest(
    val model: String,
    val messages: List<OpenAIMessage>,
    val temperature: Float,
    @kotlinx.serialization.SerialName("max_tokens")
    val maxTokens: Int
)

@Serializable
private data class OpenAIMessage(
    val role: String,
    val content: String
)

@Serializable
private data class OpenAIChatResponse(
    val choices: List<OpenAIChoice> = emptyList(),
    val usage: OpenAIUsage? = null
)

@Serializable
private data class OpenAIChoice(
    val message: OpenAIMessageResponse? = null,
    @kotlinx.serialization.SerialName("finish_reason")
    val finishReason: String? = null
)

@Serializable
private data class OpenAIMessageResponse(
    val role: String = "",
    val content: String = ""
)

@Serializable
private data class OpenAIUsage(
    @kotlinx.serialization.SerialName("prompt_tokens")
    val promptTokens: Int = 0,
    @kotlinx.serialization.SerialName("completion_tokens")
    val completionTokens: Int = 0,
    @kotlinx.serialization.SerialName("total_tokens")
    val totalTokens: Int = 0
)
