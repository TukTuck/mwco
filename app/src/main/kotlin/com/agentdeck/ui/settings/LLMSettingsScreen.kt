// SPDX-License-Identifier: MIT
package com.agentdeck.ui.settings

import android.content.Context
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.agentdeck.core.common.SecureKeyStore
import com.agentdeck.llm.api.LLMProviderFactory

/**
 * Settings screen for configuring LLM providers.
 *
 * ## Provider-Auswahl:
 * Der User wählt zwischen lokalen Modellen (Privacy, Offline) und Remote-APIs (Power, Einfachheit).
 * API-Keys werden im [com.agentdeck.core.common.SecureKeyStore] gespeichert.
 *
 * ## Empfohlene Konfiguration:
 * - Nvidia NIM für die meisten User (kostenlos, zuverlässig)
 * - Lokales Qwen2.5-1.5B für Privacy-fokussierte User (braucht ~1.5GB RAM)
 * - MiniLM als Minimum für sehr alte Devices (~80MB)
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LLMSettingsScreen(
    context: Context,
    onNavigateBack: () -> Unit
) {
    val keyStore = remember { SecureKeyStore(context) }
    
    var selectedProvider by remember { mutableStateOf("local_onnx") }
    var nvidiaApiKey by remember { mutableStateOf(keyStore.getApiKey(SecureKeyStore.PROVIDER_NVIDIA_NIM) ?: "") }
    var openaiApiKey by remember { mutableStateOf(keyStore.getApiKey(SecureKeyStore.PROVIDER_OPENAI) ?: "") }
    var showApiKey by remember { mutableStateOf(false) }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("LLM Provider Konfiguration") },
                navigationIcon = {
                    TextButton(onClick = onNavigateBack) {
                        Text("←")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                "Wähle deinen LLM-Provider",
                style = MaterialTheme.typography.headlineSmall
            )
            
            Text(
                "Der Orchestrator nutzt ein LLM für Task-Formulierung und Interpretation. " +
                "Du kannst ein lokales Modell oder eine Remote-API verwenden.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            
            Divider()
            
            // ── Local Providers ──────────────────
            Text(
                "Lokale Modelle (Offline, Privacy)",
                style = MaterialTheme.typography.titleMedium
            )
            
            ProviderOption(
                title = "MiniLM (ONNX, ~80MB)",
                description = "Minimal-Konfiguration. Nur Intent-Classification. Läuft auf jedem Gerät.",
                selected = selectedProvider == "local_onnx",
                onClick = { selectedProvider = "local_onnx" }
            )
            
            ProviderOption(
                title = "Qwen2.5-0.5B (GGUF Q4, ~350MB)",
                description = "Kleines Modell für Task-Formulierung. Benötigt ~600MB RAM.",
                selected = selectedProvider == "local_qwen_05b",
                onClick = { selectedProvider = "local_qwen_05b" }
            )
            
            ProviderOption(
                title = "Qwen2.5-1.5B (GGUF Q4, ~900MB)",
                description = "Empfohlen für beste lokale Qualität. Benötigt ~1.5GB RAM.",
                selected = selectedProvider == "local_qwen_15b",
                onClick = { selectedProvider = "local_qwen_15b" }
            )
            
            Divider()
            
            // ── Remote Providers ──────────────────
            Text(
                "Remote APIs (Cloud, benötigt API-Key)",
                style = MaterialTheme.typography.titleMedium
            )
            
            ProviderOption(
                title = "Nvidia NIM (empfohlen)",
                description = "Immer verfügbar, viele Modelle. Kostenlos mit Nvidia-Account.",
                selected = selectedProvider == "remote_nvidia",
                onClick = { selectedProvider = "remote_nvidia" }
            )
            
            if (selectedProvider == "remote_nvidia") {
                ApiKeyInput(
                    label = "Nvidia NIM API Key",
                    value = nvidiaApiKey,
                    onValueChange = { nvidiaApiKey = it },
                    showKey = showApiKey,
                    onToggleShow = { showApiKey = !showApiKey },
                    onSave = {
                        keyStore.storeApiKey(SecureKeyStore.PROVIDER_NVIDIA_NIM, nvidiaApiKey)
                    }
                )
            }
            
            ProviderOption(
                title = "OpenAI / Kompatibel",
                description = "GPT-4o, GPT-4o-mini, oder kompatible Endpoints.",
                selected = selectedProvider == "remote_openai",
                onClick = { selectedProvider = "remote_openai" }
            )
            
            if (selectedProvider == "remote_openai") {
                ApiKeyInput(
                    label = "OpenAI API Key",
                    value = openaiApiKey,
                    onValueChange = { openaiApiKey = it },
                    showKey = showApiKey,
                    onToggleShow = { showApiKey = !showApiKey },
                    onSave = {
                        keyStore.storeApiKey(SecureKeyStore.PROVIDER_OPENAI, openaiApiKey)
                    }
                )
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            
            Button(
                onClick = {
                    // Save configuration and navigate back
                    onNavigateBack()
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Konfiguration speichern")
            }
        }
    }
}

@Composable
private fun ProviderOption(
    title: String,
    description: String,
    selected: Boolean,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = if (selected) {
            CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
        } else {
            CardDefaults.cardColors()
        },
        onClick = onClick
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                RadioButton(selected = selected, onClick = onClick)
                Spacer(modifier = Modifier.width(8.dp))
                Text(title, style = MaterialTheme.typography.titleSmall)
            }
            Text(
                description,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(start = 40.dp)
            )
        }
    }
}

@Composable
private fun ApiKeyInput(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    showKey: Boolean,
    onToggleShow: () -> Unit,
    onSave: () -> Unit
) {
    Column(modifier = Modifier.padding(start = 40.dp)) {
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            label = { Text(label) },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            visualTransformation = if (showKey) {
                androidx.compose.ui.text.input.VisualTransformation.None
            } else {
                androidx.compose.ui.text.input.PasswordVisualTransformation()
            }
        )
        
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            TextButton(onClick = onToggleShow) {
                Text(if (showKey) "Verbergen" else "Anzeigen")
            }
            
            Button(onClick = onSave) {
                Text("Speichern")
            }
        }
    }
}
