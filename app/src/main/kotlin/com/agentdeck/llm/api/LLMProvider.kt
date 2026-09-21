package com.agentdeck.llm.api

import kotlinx.coroutines.flow.Flow

/**
 * Core interface for all LLM providers (local and remote).
 *
 * ## Warum ein Interface?
 * Der ursprüngliche Blueprint sah ein festes Modell (SmolLM2 135M) vor.
 * Problem: 135M-Modelle sind zu schwach für zuverlässige JSON-Generierung.
 * Lösung: Provider austauschbar machen – User wählt basierend auf RAM/Use-Case.
 *
 * ## Implementierungen:
 * - [com.agentdeck.llm.local.ONNXLiteProvider] – MiniLM (~80MB), nur Intent-Classification
 * - [com.agentdeck.llm.local.LlamaCppProvider] – GGUF-Modelle (Qwen2.5 0.5B-1.5B)
 * - [com.agentdeck.llm.remote.NvidiaNIMProvider] – Nvidia NIM API (empfohlen als Fallback)
 * - [com.agentdeck.llm.remote.OpenAIProvider] – OpenAI + kompatible Endpoints
 *
 * ## Thread-Safety:
 * Implementierungen müssen thread-safe sein – der Orchestrator ruft [complete]
 * potentiell parallel für verschiedene Tasks auf.
 */
interface LLMProvider {
    val name: String
    val isAvailable: Boolean
    val capabilities: Set<LLMCapability>
    
    /**
     * Complete a prompt and return the full response.
     *
     * @return [Result.success] mit dem generierten Text, oder [Result.failure] bei Fehlern.
     *         Fehler sollten Network-Errors, Rate-Limits und Modell-Errors umfassen.
     */
    suspend fun complete(
        prompt: String,
        options: CompletionOptions = CompletionOptions()
    ): Result<String>
    
    /**
     * Stream a completion response token by token.
     *
     * Wird primär für UI-Updates genutzt (User sieht Fortschritt).
     * Der Orchestrator nutzt [complete] für Task-Decomposition (braucht volle Response).
     */
    fun stream(
        prompt: String,
        options: CompletionOptions = CompletionOptions()
    ): Flow<Result<String>>
    
    /**
     * Check if the provider can handle the given request size.
     *
     * Wichtig für Context-Window-Management: Der Orchestrator prüft VOR dem Call
     * ob der Provider genug Context hat (z.B. MiniLM hat nur 512 Tokens).
     * Wenn false → Orchestrator muss Context kürzen oder anderen Provider wählen.
     */
    fun canHandle(tokenCount: Int): Boolean
    
    /**
     * Get current resource usage (RAM, CPU, etc.)
     *
     * Wird für UI-Anzeige und automatische Provider-Auswahl genutzt.
     * Bei lokalen Modellen: tatsächlicher RAM-Verbrauch.
     * Bei Remote-APIs: immer 0 (kein lokaler Ressourcenverbrauch).
     */
    suspend fun getResourceUsage(): ResourceUsage
    
    /**
     * Release resources (unload model, close connections).
     *
     * Muss aufgerufen werden wenn der Provider nicht mehr gebraucht wird,
     * um Memory-Leaks zu vermeiden (besonders wichtig bei lokalen Modellen).
     */
    suspend fun release()
}

/**
 * Capabilities that an LLM provider can advertise.
 *
 * Der Orchestrator nutzt diese um zu entscheiden welcher Provider
 * für welche Aufgabe geeignet ist. Beispiel:
 * - Task-Decomposition braucht [JSON_STRUCTURED_OUTPUT]
 * - Intent-Erkennung braucht nur [INTENT_CLASSIFICATION] (MiniLM reicht)
 * - Große Blueprints brauchen [LONG_CONTEXT]
 */
enum class LLMCapability {
    TEXT_GENERATION,
    JSON_STRUCTURED_OUTPUT,
    INTENT_CLASSIFICATION,
    TASK_FORMULATION,
    LONG_CONTEXT,  // >4K tokens – wichtig für große Blueprints + Task-Listen
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
