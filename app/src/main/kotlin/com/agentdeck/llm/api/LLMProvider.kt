package com.agentdeck.llm.api

import kotlinx.coroutines.flow.Flow

/**
 * Core interface for all LLM providers (local and remote).
 * Implementations can be ONNX Runtime, llama.cpp, Nvidia NIM, OpenAI, etc.
 */
interface LLMProvider {
    val name: String
    val isAvailable: Boolean
    val capabilities: Set<LLMCapability>
    
    /**
     * Complete a prompt and return the full response.
     */
    suspend fun complete(
        prompt: String,
        options: CompletionOptions = CompletionOptions()
    ): Result<String>
    
    /**
     * Stream a completion response token by token.
     */
    fun stream(
        prompt: String,
        options: CompletionOptions = CompletionOptions()
    ): Flow<Result<String>>
    
    /**
     * Check if the provider can handle the given request size.
     */
    fun canHandle(tokenCount: Int): Boolean
    
    /**
     * Get current resource usage (RAM, CPU, etc.)
     */
    suspend fun getResourceUsage(): ResourceUsage
    
    /**
     * Release resources (unload model, close connections).
     */
    suspend fun release()
}

/**
 * What the LLM can do
 */
enum class LLMCapability {
    TEXT_GENERATION,
    JSON_STRUCTURED_OUTPUT,
    INTENT_CLASSIFICATION,
    TASK_FORMULATION,
    LONG_CONTEXT,  // >4K tokens
    STREAMING
}

/**
 * Options for completion requests
 */
data class CompletionOptions(
    val temperature: Float = 0.7f,
    val maxTokens: Int = 512,
    val stopSequences: List<String> = emptyList(),
    val jsonSchema: String? = null,  // For structured output
    val systemPrompt: String? = null
)

/**
 * Resource usage metrics
 */
data class ResourceUsage(
    val memoryMB: Int,
    val cpuPercent: Float,
    val isLoaded: Boolean
)
