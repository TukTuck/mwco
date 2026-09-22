// SPDX-License-Identifier: MIT
package com.agentdeck.llm.api

import android.content.Context
import com.agentdeck.llm.local.ONNXLiteProvider
import com.agentdeck.llm.local.LlamaCppProvider
import com.agentdeck.llm.remote.NvidiaNIMProvider
import com.agentdeck.llm.remote.OpenAIProvider

/**
 * Factory for creating LLM providers based on configuration.
 *
 * ## Auto-Detection:
 * [getRecommendedConfig] wählt automatisch den besten Provider basierend auf:
 * - Verfügbarer RAM (Device-Capability)
 * - Vorhandener API-Key (Remote bevorzugt wenn vorhanden)
 *
 * ## Fallback-Strategie (in [com.agentdeck.di.AppModule] implementiert):
 * 1. Nvidia NIM (wenn API-Key vorhanden) – immer verfügbar, kostenlos
 * 2. OpenAI (wenn API-Key vorhanden) – zuverlässig, kostet Geld
 * 3. null (kein Provider) – rein regelbasierte Orchestrierung
 *
 * ## Warum keine lokale Auto-Detection im MVP?
 * Lokale Modelle brauchen vorherigen Download (Assets oder Runtime).
 * Im MVP nutzen wir nur Remote-APIs, lokale Provider sind nur Mocks.
 */
object LLMProviderFactory {
    
    sealed class ProviderConfig {
        // Local providers
        data class ONNXLite(
            val modelPath: String,
            val maxTokens: Int = 512
        ) : ProviderConfig()
        
        data class LlamaCpp(
            val modelPath: String,
            val contextSize: Int = 2048,
            val threads: Int = 4,
            val gpuLayers: Int = 0
        ) : ProviderConfig()
        
        // Remote providers
        data class NvidiaNIM(
            val apiKey: String,
            val model: String = "meta/llama-3.1-8b-instruct",
            val baseUrl: String = "https://integrate.api.nvidia.com/v1"
        ) : ProviderConfig()
        
        data class OpenAI(
            val apiKey: String,
            val model: String = "gpt-4o-mini",
            val baseUrl: String = "https://api.openai.com/v1"
        ) : ProviderConfig()
        
        data class CustomREST(
            val apiKey: String,
            val baseUrl: String,
            val model: String,
            val headers: Map<String, String> = emptyMap()
        ) : ProviderConfig()
    }
    
    /**
     * Create a provider from configuration
     */
    fun create(context: Context, config: ProviderConfig): LLMProvider {
        return when (config) {
            is ProviderConfig.ONNXLite -> ONNXLiteProvider(context, config)
            is ProviderConfig.LlamaCpp -> LlamaCppProvider(context, config)
            is ProviderConfig.NvidiaNIM -> NvidiaNIMProvider(config)
            is ProviderConfig.OpenAI -> OpenAIProvider(config)
            is ProviderConfig.CustomREST -> TODO("Implement custom REST provider")
        }
    }
    
    /**
     * Get recommended configuration based on device capabilities
     */
    suspend fun getRecommendedConfig(
        context: Context,
        availableMemoryMB: Int,
        hasApiKey: Boolean
    ): ProviderConfig {
        return when {
            // If user has API key, prefer remote (saves battery)
            hasApiKey -> ProviderConfig.NvidiaNIM(
                apiKey = "TODO_LOAD_FROM_KEYSTORE",
                model = "meta/llama-3.1-8b-instruct"
            )
            
            // Low memory device (<2GB free) -> minimal ONNX model
            availableMemoryMB < 2000 -> ProviderConfig.ONNXLite(
                modelPath = "models/minilm-l6-v2.onnx",
                maxTokens = 128
            )
            
            // Medium memory (2-4GB) -> small GGUF model
            availableMemoryMB < 4000 -> ProviderConfig.LlamaCpp(
                modelPath = "models/qwen2.5-0.5b-q4.gguf",
                contextSize = 2048,
                threads = 4
            )
            
            // High memory (>4GB) -> larger GGUF model
            else -> ProviderConfig.LlamaCpp(
                modelPath = "models/qwen2.5-1.5b-q4.gguf",
                contextSize = 4096,
                threads = 6,
                gpuLayers = 10
            )
        }
    }
}
