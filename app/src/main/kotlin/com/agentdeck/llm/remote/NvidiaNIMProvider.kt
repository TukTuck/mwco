// SPDX-License-Identifier: MIT
package com.agentdeck.llm.remote

import com.agentdeck.llm.api.*
import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.engine.android.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.utils.io.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import timber.log.Timber

/**
 * Nvidia NIM API provider.
 * Supports streaming via Server-Sent Events (SSE).
 */
class NvidiaNIMProvider(
    private val config: LLMProviderFactory.ProviderConfig.NvidiaNIM
) : LLMProvider {
    
    override val name = "Nvidia NIM (${config.model})"
    override val isAvailable = true
    
    override val capabilities = setOf(
        LLMCapability.TEXT_GENERATION,
        LLMCapability.JSON_STRUCTURED_OUTPUT,
        LLMCapability.TASK_FORMULATION,
        LLMCapability.LONG_CONTEXT,
        LLMCapability.STREAMING
    )
    
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
    
    override suspend fun complete(
        prompt: String,
        options: CompletionOptions
    ): Result<String> {
        return try {
            val request = ChatCompletionRequest(
                model = config.model,
                messages = buildList {
                    options.systemPrompt?.let { add(Message("system", it)) }
                    add(Message("user", prompt))
                },
                temperature = options.temperature,
                maxTokens = options.maxTokens,
                stream = false
            )
            
            val response: HttpResponse = client.post("${config.baseUrl}/chat/completions") {
                header("Authorization", "Bearer ${config.apiKey}")
                contentType(ContentType.Application.Json)
                setBody(request)
            }
            
            if (response.status.isSuccess()) {
                val bodyText = response.bodyAsText()
                val completion = jsonParser.decodeFromString<ChatCompletionResponse>(bodyText)
                val content = completion.choices.firstOrNull()?.message?.content
                    ?: throw IllegalStateException("Empty response from Nvidia NIM")
                
                Timber.d("Nvidia NIM response: ${content.take(200)}")
                Result.success(content)
            } else {
                val errorBody = response.bodyAsText()
                Timber.e("Nvidia NIM error ${response.status}: $errorBody")
                Result.failure(Exception("HTTP ${response.status.value}: $errorBody"))
            }
        } catch (e: Exception) {
            Timber.e(e, "Nvidia NIM request failed")
            Result.failure(e)
        }
    }
    
    override fun stream(
        prompt: String,
        options: CompletionOptions
    ): Flow<Result<String>> = flow {
        try {
            val request = ChatCompletionRequest(
                model = config.model,
                messages = buildList {
                    options.systemPrompt?.let { add(Message("system", it)) }
                    add(Message("user", prompt))
                },
                temperature = options.temperature,
                maxTokens = options.maxTokens,
                stream = true
            )
            
            val response: HttpResponse = client.post("${config.baseUrl}/chat/completions") {
                header("Authorization", "Bearer ${config.apiKey}")
                contentType(ContentType.Application.Json)
                setBody(request)
            }
            
            if (!response.status.isSuccess()) {
                emit(Result.failure(Exception("HTTP ${response.status.value}")))
                return@flow
            }
            
            val channel: ByteReadChannel = response.bodyAsChannel()
            val buffer = StringBuilder()
            
            while (!channel.isClosedForRead) {
                val line = channel.readUTF8Line() ?: break
                
                if (line.startsWith("data: ")) {
                    val data = line.removePrefix("data: ").trim()
                    
                    if (data == "[DONE]") {
                        break
                    }
                    
                    try {
                        val chunk = jsonParser.decodeFromString<StreamChunk>(data)
                        val delta = chunk.choices.firstOrNull()?.delta?.content
                        
                        if (!delta.isNullOrBlank()) {
                            buffer.append(delta)
                            emit(Result.success(delta))
                        }
                    } catch (e: Exception) {
                        // Skip malformed chunks
                    }
                }
            }
            
            Timber.d("Stream complete, total length: ${buffer.length}")
        } catch (e: Exception) {
            Timber.e(e, "Nvidia NIM stream failed")
            emit(Result.failure(e))
        }
    }
    
    override fun canHandle(tokenCount: Int): Boolean {
        return tokenCount <= 32000
    }
    
    override suspend fun getResourceUsage(): ResourceUsage {
        return ResourceUsage(memoryMB = 0, cpuPercent = 0f, isLoaded = true)
    }
    
    override suspend fun release() {
        client.close()
    }
}

// ── Serialization models ──────────────────────

@Serializable
private data class ChatCompletionRequest(
    val model: String,
    val messages: List<Message>,
    val temperature: Float,
    val max_tokens: Int,
    val stream: Boolean
)

@Serializable
private data class Message(
    val role: String,
    val content: String
)

@Serializable
private data class ChatCompletionResponse(
    val choices: List<Choice> = emptyList()
)

@Serializable
private data class Choice(
    val message: MessageResponse? = null,
    val delta: DeltaResponse? = null
)

@Serializable
private data class MessageResponse(
    val role: String = "",
    val content: String = ""
)

@Serializable
private data class DeltaResponse(
    val role: String? = null,
    val content: String? = null
)

@Serializable
private data class StreamChunk(
    val choices: List<Choice> = emptyList()
)
