// SPDX-License-Identifier: MIT
package com.agentdeck.core.common

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import java.security.KeyStore

/**
 * Secure storage for API keys and sensitive data.
 *
 * ## Warum EncryptedSharedPreferences?
 * - Normale SharedPreferences = Klartext (root-Zugriff kann lesen)
 * - EncryptedSharedPreferences = AES256-GCM verschlüsselt
 * - Master-Key liegt im Android Keystore (Hardware-backed wenn verfügbar)
 *
 * ## Was wird gespeichert:
 * - API-Keys für Nvidia NIM, OpenAI, Claude
 * - LLM-Provider-Konfiguration (welcher Provider, welches Modell)
 *
 * ## Was NICHT hier gespeichert wird:
 * - Blueprints/Tasks (→ Room Database)
 * - Agent-Ergebnisse (→ Room Database)
 * - Session-Tokens (→ Memory only, nie persistieren)
 */
class SecureKeyStore(private val context: Context) {
    
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()
    
    private val prefs = EncryptedSharedPreferences.create(
        context,
        "agent_deck_secure_prefs",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )
    
    /**
     * Store an API key securely
     */
    fun storeApiKey(provider: String, apiKey: String) {
        prefs.edit()
            .putString("api_key_$provider", apiKey)
            .apply()
    }
    
    /**
     * Retrieve an API key
     */
    fun getApiKey(provider: String): String? {
        return prefs.getString("api_key_$provider", null)
    }
    
    /**
     * Remove an API key
     */
    fun removeApiKey(provider: String) {
        prefs.edit()
            .remove("api_key_$provider")
            .apply()
    }
    
    /**
     * Check if an API key exists for a provider
     */
    fun hasApiKey(provider: String): Boolean {
        return prefs.contains("api_key_$provider")
    }
    
    /**
     * Store LLM provider configuration
     */
    fun storeLLMConfig(configJson: String) {
        prefs.edit()
            .putString("llm_config", configJson)
            .apply()
    }
    
    /**
     * Retrieve LLM provider configuration
     */
    fun getLLMConfig(): String? {
        return prefs.getString("llm_config", null)
    }
    
    companion object {
        const val PROVIDER_NVIDIA_NIM = "nvidia_nim"
        const val PROVIDER_OPENAI = "openai"
        const val PROVIDER_CLAUDE = "claude"
        const val PROVIDER_ARENA = "arena"
    }
}
