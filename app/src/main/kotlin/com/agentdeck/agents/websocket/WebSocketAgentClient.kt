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
import kotlinx.serialization.json.*
import timber.log.Timber

/**
 * Generic WebSocket agent client.
 * Connects to a remote agent via WebSocket protocol (e.g., PC Bridge).
 *
 * Protocol (siehe pc-bridge/src/server/Protocol.ts):
 * - Send: JSON task request mit actions
 * - Receive: JSON progress updates + final result (result_type)
 *
 * Message format:
 * {
 *   "type": "auth" | "task_request" | "task_cancel" | "progress" | "result" | "error",
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

                // Auth MUSS immer als erste Nachricht kommen (PC-Bridge verlangt das, auch wenn requireAuth=false)
                val authToken = config.authToken ?: ""
                send(json.encodeToString(WebSocketMessage(
                    type = "auth",
                    taskId = "",
                    payload = buildJsonObject { put("token", authToken) }
                )))
                Timber.d("Sent auth (token length ${authToken.length})")

                // Task-Request mit actions — PC-Bridge erwartet actions Array
                val actions = buildJsonArray {
                    add(buildJsonObject {
                        put("type", "terminal")
                        // Nutze description als Befehl, fallback auf Titel
                        val cmd = task.description.ifBlank { task.title }.take(2000).replace("\"", "'")
                        put("command", cmd)
                    })
                }
                val requestPayload = buildJsonObject {
                    put("title", task.title)
                    put("description", task.description)
                    put("priority", task.priority.name)
                    put("timeout_seconds", task.timeoutSeconds)
                    put("actions", actions)
                }
                val request = WebSocketMessage(
                    type = "task_request",
                    taskId = task.id,
                    payload = requestPayload
                )
                send(json.encodeToString(request))
                Timber.d("Sent task ${task.id} via WebSocket with 1 action")

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
                                            val msg = message.payload["message"]?.jsonPrimitive?.contentOrNull ?: "working"
                                            Timber.d("Progress for ${task.id}: $msg")
                                        }
                                        "result" -> {
                                            resultChannel.send(message)
                                            break
                                        }
                                        "error" -> {
                                            resultChannel.send(message)
                                            break
                                        }
                                        "auth_ok" -> {
                                            Timber.d("WebSocket authenticated")
                                        }
                                        "auth_failed" -> {
                                            Timber.w("WebSocket auth failed")
                                            resultChannel.send(message)
                                            break
                                        }
                                        else -> {
                                            Timber.w("Unknown WebSocket message type: ${message.type}")
                                        }
                                    }
                                } catch (e: Exception) {
                                    Timber.w(e, "Failed to parse WebSocket message: $text")
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
                // PC sendet result_type und content, nicht type
                val payload = resultMessage.payload
                val content = payload["content"]?.jsonPrimitive?.contentOrNull ?: ""
                val resultTypeStr = payload["result_type"]?.jsonPrimitive?.contentOrNull
                    ?: payload["type"]?.jsonPrimitive?.contentOrNull // Fallback für alte Server
                    ?: "TEXT"
                Result.success(
                    TaskResult(
                        content = content,
                        type = when (resultTypeStr.uppercase()) {
                            "CODE" -> ResultType.CODE
                            "JSON" -> ResultType.JSON
                            "FILE" -> ResultType.FILE
                            else -> ResultType.TEXT
                        },
                        metadata = mapOf("source" to "websocket", "task_id" to resultMessage.taskId)
                    )
                )
            } else if (resultMessage?.type == "error" || resultMessage?.type == "auth_failed") {
                val error = resultMessage.payload["error"]?.jsonPrimitive?.contentOrNull ?: "WebSocket error"
                Result.failure(Exception(error))
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
            // PC-Bridge erwartet task_cancel, nicht cancel
            session?.send(json.encodeToString(WebSocketMessage(
                type = "task_cancel",
                taskId = taskId,
                payload = buildJsonObject {}
            )))
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun checkAvailability(): AgentStatus {
        return try {
            client.webSocket(config.url) {
                // Auch beim Check muss auth als erste Nachricht
                val token = config.authToken ?: ""
                send(json.encodeToString(WebSocketMessage(
                    type = "auth",
                    taskId = "",
                    payload = buildJsonObject { put("token", token) }
                )))
                // Warte kurz auf auth_ok
                withTimeout(5000) {
                    for (frame in incoming) {
                        if (frame is Frame.Text) {
                            val msg = json.decodeFromString<WebSocketMessage>(frame.readText())
                            if (msg.type == "auth_ok") {
                                _isConnected = true
                                break
                            }
                        }
                    }
                }
                close()
            }
            if (_isConnected) AgentStatus.ONLINE else AgentStatus.OFFLINE
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
    val payload: JsonObject = JsonObject(emptyMap())
)
