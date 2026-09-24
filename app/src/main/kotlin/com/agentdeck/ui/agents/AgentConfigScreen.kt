// SPDX-License-Identifier: MIT
package com.agentdeck.ui.agents

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.agentdeck.core.domain.AgentConfig
import com.agentdeck.core.common.SecureKeyStore

/**
 * Agent Configuration Screen
 * 
 * Ermöglicht Benutzern, API-Keys und Einstellungen für verschiedene Agenten zu konfigurieren.
 * Keys werden sicher in Android Keystore gespeichert.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AgentConfigScreen(
    onNavigateBack: () -> Unit
) {
    val keyStore = remember { SecureKeyStore() }
    var nvidiaKey by remember { mutableStateOf("") }
    var openaiKey by remember { mutableStateOf("") }
    var claudeKey by remember { mutableStateOf("") }
    var arenaKey by remember { mutableStateOf("") }
    var savedMessage by remember { mutableStateOf<String?>(null) }

    // Keys beim Start laden
    LaunchedEffect(Unit) {
        nvidiaKey = keyStore.getApiKey("nvidia") ?: ""
        openaiKey = keyStore.getApiKey("openai") ?: ""
        claudeKey = keyStore.getApiKey("claude") ?: ""
        arenaKey = keyStore.getApiKey("arena") ?: ""
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Agenten konfigurieren") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Zurück")
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
                "API-Keys",
                style = MaterialTheme.typography.headlineSmall
            )
            
            Text(
                "Konfiguriere hier die API-Keys für verschiedene LLM-Provider. " +
                "Keys werden sicher im Android Keystore gespeichert.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            // ── Nvidia NIM ──────────────────
            AgentKeyCard(
                name = "Nvidia NIM",
                description = "Lokale LLMs über Nvidia NIM API",
                apiKey = nvidiaKey,
                onKeyChange = { nvidiaKey = it },
                onSave = {
                    keyStore.saveApiKey("nvidia", nvidiaKey)
                    savedMessage = "Nvidia Key gespeichert"
                }
            )

            // ── OpenAI ──────────────────
            AgentKeyCard(
                name = "OpenAI",
                description = "GPT-4o und andere OpenAI Modelle",
                apiKey = openaiKey,
                onKeyChange = { openaiKey = it },
                onSave = {
                    keyStore.saveApiKey("openai", openaiKey)
                    savedMessage = "OpenAI Key gespeichert"
                }
            )

            // ── Claude ──────────────────
            AgentKeyCard(
                name = "Claude",
                description = "Anthropic Claude Modelle",
                apiKey = claudeKey,
                onKeyChange = { claudeKey = it },
                onSave = {
                    keyStore.saveApiKey("claude", claudeKey)
                    savedMessage = "Claude Key gespeichert"
                }
            )

            // ── Arena AI ──────────────────
            AgentKeyCard(
                name = "Arena AI",
                description = "Arena Cloud Sessions",
                apiKey = arenaKey,
                onKeyChange = { arenaKey = it },
                onSave = {
                    keyStore.saveApiKey("arena", arenaKey)
                    savedMessage = "Arena Key gespeichert"
                }
            )

            // ── Success Message ──────────────────
            savedMessage?.let { message ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.primaryContainer
                    )
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Default.Check, contentDescription = null)
                        Text(message)
                    }
                }
                
                LaunchedEffect(message) {
                    kotlinx.coroutines.delay(3000)
                    savedMessage = null
                }
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

@Composable
private fun AgentKeyCard(
    name: String,
    description: String,
    apiKey: String,
    onKeyChange: (String) -> Unit,
    onSave: () -> Unit
) {
    var showKey by remember { mutableStateOf(false) }
    
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(name, style = MaterialTheme.typography.titleMedium)
            Text(
                description,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            
            OutlinedTextField(
                value = apiKey,
                onValueChange = onKeyChange,
                label = { Text("API Key") },
                modifier = Modifier.fillMaxWidth(),
                visualTransformation = if (showKey) 
                    androidx.compose.ui.text.input.VisualTransformation.None 
                else 
                    PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                singleLine = true,
                trailingIcon = {
                    TextButton(onClick = { showKey = !showKey }) {
                        Text(if (showKey) "Verbergen" else "Zeigen")
                    }
                }
            )
            
            Button(
                onClick = onSave,
                modifier = Modifier.fillMaxWidth(),
                enabled = apiKey.isNotBlank()
            ) {
                Text("Speichern")
            }
        }
    }
}
