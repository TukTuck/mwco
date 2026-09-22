// SPDX-License-Identifier: MIT
package com.agentdeck.llm.local

import android.content.Context
import com.agentdeck.llm.api.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow

/**
 * Lightweight ONNX Runtime provider for intent classification and simple tasks.
 * Uses MiniLM or similar small models (~80MB).
 * 
 * This is the MINIMAL configuration that runs on any device.
 */
class ONNXLiteProvider(
    private val context: Context,
    private val config: LLMProviderFactory.ProviderConfig.ONNXLite
) : LLMProvider {
    
    override val name = "ONNX-Lite (MiniLM)"
    override val isAvailable: Boolean
        get() = _isLoaded
    
    override val capabilities = setOf(
        LLMCapability.INTENT_CLASSIFICATION,
        LLMCapability.TEXT_GENERATION  // Limited
    )
    
    private var _isLoaded = false
    private var ortSession: Any? = null  // ONNX Runtime session
    
    init {
        // Load model on init (lazy loading would be better)
        loadModel()
    }
    
    private fun loadModel() {
        try {
            // TODO: Implement ONNX Runtime loading
            // val env = OrtEnvironment.getEnvironment()
            // val sessionOptions = OrtSession.SessionOptions()
            // ortSession = env.createSession(config.modelPath, sessionOptions)
            _isLoaded = true
        } catch (e: Exception) {
            _isLoaded = false
        }
    }
    
    override suspend fun complete(
        prompt: String,
        options: CompletionOptions
    ): Result<String> {
        if (!isAvailable) {
            return Result.failure(IllegalStateException("ONNX model not loaded"))
        }
        
        return try {
            // TODO: Implement actual ONNX inference
            // For now, return a mock response
            val response = mockInference(prompt)
            Result.success(response)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    override fun stream(
        prompt: String,
        options: CompletionOptions
    ): Flow<Result<String>> = flow {
        // ONNX models typically don't stream well
        // Just emit the full result
        emit(complete(prompt, options))
    }
    
    override fun canHandle(tokenCount: Int): Boolean {
        // MiniLM has limited context (512 tokens typically)
        return tokenCount <= 512
    }
    
    override suspend fun getResourceUsage(): ResourceUsage {
        return ResourceUsage(
            memoryMB = 80,  // Approximate
            cpuPercent = 5f,
            isLoaded = _isLoaded
        )
    }
    
    override suspend fun release() {
        // TODO: Close ONNX session
        ortSession = null
        _isLoaded = false
    }
    
    private fun mockInference(prompt: String): String {
        // TODO: Replace with actual ONNX inference
        // This is just for testing the architecture
        return """
            {
                "action": "dispatch_task",
                "reason": "Mock response from ONNX-Lite",
                "tasks": []
            }
        """.trimIndent()
    }
}
