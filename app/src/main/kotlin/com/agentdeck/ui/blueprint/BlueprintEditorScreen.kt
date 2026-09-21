package com.agentdeck.ui.blueprint

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

/**
 * Blueprint Editor Screen.
 *
 * ## Design-Entscheidung: Freitext statt Formular
 * - Formular: Zu starr, User muss alle Felder ausfüllen
 * - Freitext: Flexibel, User schreibt natürlich
 * - Parser im ViewModel extrahiert Struktur automatisch
 *
 * ## Template:
 * Ein vordefiniertes Template hilft dem User zu verstehen welches Format erwartet wird.
 * Der Parser erkennt Abschnitte wie "Projekt:", "Ziel:", "Technologie:", "Kernmodule:", "Ablauf:".
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BlueprintEditorScreen(
    blueprint: String,
    onSave: (String) -> Unit,
    onStart: () -> Unit,
    onNavigateBack: () -> Unit
) {
    var text by remember { mutableStateOf(blueprint) }
    var showTemplate by remember { mutableStateOf(text.isBlank()) }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Blueprint Editor") },
                navigationIcon = {
                    TextButton(onClick = onNavigateBack) {
                        Text("←")
                    }
                },
                actions = {
                    TextButton(onClick = { onSave(text) }) {
                        Text("Speichern")
                    }
                }
            )
        },
        bottomBar = {
            Surface(
                tonalElevation = 3.dp
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedButton(
                        onClick = { 
                            text = TEMPLATE_BLUEPRINT
                            showTemplate = false
                        },
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Template laden")
                    }
                    
                    Button(
                        onClick = {
                            onSave(text)
                            onStart()
                        },
                        modifier = Modifier.weight(1f),
                        enabled = text.isNotBlank()
                    ) {
                        Text("Starten ▶")
                    }
                }
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
        ) {
            if (showTemplate) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.primaryContainer
                    )
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            "💡 Tipp",
                            style = MaterialTheme.typography.titleSmall
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            "Schreibe deinen Blueprint als strukturierten Text. " +
                            "Nutze Abschnitte wie 'Projekt:', 'Ziel:', 'Technologie:', 'Kernmodule:', 'Ablauf:'. " +
                            "Oder lade das Template für ein Beispiel.",
                            style = MaterialTheme.typography.bodySmall
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        TextButton(onClick = { showTemplate = false }) {
                            Text("Verstanden")
                        }
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))
            }
            
            OutlinedTextField(
                value = text,
                onValueChange = { text = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .verticalScroll(rememberScrollState()),
                placeholder = {
                    Text(
                        "Projekt: Mein Projekt\n\n" +
                        "Ziel:\nBeschreibe was gebaut werden soll...\n\n" +
                        "Technologie:\n- Kotlin\n- Jetpack Compose\n\n" +
                        "Kernmodule:\n- Dashboard\n- API Client\n\n" +
                        "Ablauf:\nplan → review → implement → test"
                    )
                },
                textStyle = MaterialTheme.typography.bodyMedium
            )
        }
    }
}

private val TEMPLATE_BLUEPRINT = """
Projekt: Agent Deck Mobile

Ziel:
Baue eine Android-App, die als mobile Kommandozentrale für mehrere Web-Chat-Agenten dient.

Nicht-Ziel:
Die App soll keine großen Modelle lokal ersetzen.

Technologie:
- Kotlin
- Jetpack Compose
- Material 3
- WebSocket für Remote-Bridge
- JSON-Protokoll

Kernmodule:
- Agent Dashboard
- Blueprint Manager
- Task Decomposer
- Dispatcher
- Monitor
- Result Collector

Ablauf:
plan → review → implement → test → deploy
""".trimIndent()
