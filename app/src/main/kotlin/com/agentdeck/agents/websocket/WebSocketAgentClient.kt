// SPDX-License-Identifier: MIT
package com.agentdeck.agents.websocket

import com.agentdeck.agents.api.*
import com.agentdeck.core.domain.*
import io.ktor.client.*
import io.ktor.client.engine.android.*
import io.ktor.client.plugins.websocket.*
import io.ktor.websocket.*
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.withTimeout
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import timber.log.Timber
import java.util.UUID

/**
 * Generic WebSocket agent client.
 * Connects to a remote agent via WebSocket protocol (e.g., PC Bridge).
 *
 * Protocol:
 * - Send: JSON task request
 * - Receive: JSON progress updates + final result
 *
 * Message format:
 * {
 *   "type": "task_request" | "progress" | "result" | "error",
 *   "task_id": "...",
 *   "payload": { ... }
 * }
 */
class WebSocketAgentClient(
    private val config: AgentConfig.WebSocket,
    override val agent: Agent
) : AgentClient {

    override val isConnected: Boolean
        get() = _isConnected

    private var _isConnected = false

    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        encodeDefaults = true
    }

    private val client = HttpClient(Android) {
        install(WebSockets) {
            pingInterval = 30_000
        }
        engine {
            connectTimeout = 15_000
            socketTimeout = 300_000  // 5 minutes for long tasks
        }
    }

    private var session: DefaultWebSocketSession? = null

    override suspend fun executeTask(task: Task): Result<TaskResult> {
        return try {
            Timber.d("Connecting to WebSocket: ${config.url}")

            val resultChannel = Channel<WebSocketMessage>(Channel.BUFFERED)

            client.webSocket(config.url) {
                session = this
                _isConnected = true

                // Authenticate if needed
                config.authToken?.let { token ->
                    send(json.encodeToString(WebSocketMessage(
                        type = "auth",
                        taskId = "",
                        payload = mapOf("token" to token)
                    )))
                }

                // Send task request
                val request = WebSocketMessage(
                    type = "task_request",
                    taskId = task.id,
                    payload = mapOf(
                        "title" to task.title,
                        "description" to task.description,
                        "priority" to task.priority.name,
                        "timeout_seconds" to task.timeoutSeconds.toString()
                    )
                )
                send(json.encodeToString(request))
                Timber.d("Sent task ${task.id} via WebSocket")

                // Wait for result
                try {
                    withTimeout(task.timeoutSeconds * 1000L) {
                        for (frame in incoming) {
                            if (frame is Frame.Text) {
                                val text = frame.readText()
                                try {
                                    val message = json.decodeFromString<WebSocketMessage>(text)

                                    when (message.type) {
                                        "progress" -> {
                                            Timber.d("Progress for ${task.id}: ${message.payload["message"]}")
                                        }
                                        "result" -> {
                                            val content = message.payload["content"] ?: ""
                                            val resultType = message.payload["type"] ?: "TEXT"
                                            resultChannel.send(message)
                                            break
                                        }
                                        "error" -> {
                                            val error = message.payload["error"] ?: "Unknown error"
                                            resultChannel.send(message)
                                            break
                                        }
                                        "auth_ok" -> {
                                            Timber.d("WebSocket authenticated")
                                        }
                                        else -> {
                                            Timber.w("Unknown WebSocket message type: ${message.type}")
                                        }
                                    }
                                } catch (e: Exception) {
                                    Timber.w(e, "Failed to parse WebSocket message")
                                }
                            }
                        }
                    }
                } catch (e: Exception) {
                    Timber.e(e, "WebSocket timeout or error")
                }
            }

            // Get result from channel
            val resultMessage = resultChannel.tryReceive().getOrNull()

            if (resultMessage?.type == "result") {
                Result.success(
                    TaskResult(
                        content = resultMessage.payload["content"] ?: "",
                        type = when (resultMessage.payload["type"]) {
                            "CODE" -> ResultType.CODE
                            "JSON" -> ResultType.JSON
                            "FILE" -> ResultType.FILE
                            else -> ResultType.TEXT
                        },
                        metadata = mapOf("source" to "websocket")
                    )
                )
            } else if (resultMessage?.type == "error") {
                Result.failure(Exception(resultMessage.payload["error"] ?: "WebSocket error"))
            } else {
                Result.failure(Exception("No result received from WebSocket agent"))
            }
        } catch (e: Exception) {
            Timber.e(e, "WebSocket connection failed")
            _isConnected = false
            Result.failure(e)
        }
    }

    override fun streamProgress(task: Task): Flow<AgentProgress> = flow {
        emit(AgentProgress(task.id, "connecting", 5f, "Verbinde mit ${config.url}..."))
    }

    override suspend fun cancelTask(taskId: String): Result<Unit> {
        return try {
            session?.send(json.encodeToString(WebSocketMessage(
                type = "cancel",
                taskId = taskId,
                payload = emptyMap()
            )))
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun checkAvailability(): AgentStatus {
        return try {
            client.webSocket(config.url) {
                _isConnected = true
                close()
            }
            AgentStatus.ONLINE
        } catch (e: Exception) {
            _isConnected = false
            AgentStatus.OFFLINE
        }
    }

    override suspend fun getRateLimitStatus(): RateLimitStatus {
        return RateLimitStatus(
            requestsRemaining = Int.MAX_VALUE,
            tokensRemaining = Int.MAX_VALUE,
            resetTimeMillis = Long.MAX_VALUE,
            isLimited = false
        )
    }

    override suspend fun disconnect() {
        try {
            session?.close()
        } catch (e: Exception) {
            // Ignore
        }
        client.close()
        _isConnected = false
    }
}

@Serializable
private data class WebSocketMessage(
    val type: String,
    @kotlinx.serialization.SerialName("task_id")
    val taskId: String,
    val payload: Map<String, String> = emptyMap()
)
