// SPDX-License-Identifier: MIT
package com.agentdeck.ui.dashboard

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.agentdeck.core.domain.*
import com.agentdeck.core.orchestration.OrchestratorState

/**
 * Main dashboard showing orchestrator status, active tasks, and agents.
 *
 * ## Design-Entscheidung:
 * Single-Screen-Overview – User sieht auf einen Blick:
 * - Orchestrator-Status (Idle/Working/Blocked/Completed/Failed)
 * - Aktive Tasks mit Fortschritt
 * - Agenten-Verfügbarkeit
 * - Blockaden (User-Input erforderlich)
 *
 * ## Warum kein Live-Update per WebSocket?
 * Der State kommt über Compose State-Flows vom ViewModel.
 * Das ist ausreichend – Tasks dauern Sekunden bis Minuten, nicht Millisekunden.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    state: OrchestratorState,
    agents: List<Agent>,
    onStartBlueprint: () -> Unit,
    onOpenSettings: () -> Unit,
    onViewTasks: () -> Unit,
    onUserResponse: (String) -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Agent Deck") },
                actions = {
                    IconButton(onClick = onOpenSettings) {
                        Text("⚙️")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // ── Status Card ──────────────────
            StatusCard(state)
            
            // ── Quick Actions ──────────────────
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Button(
                    onClick = onStartBlueprint,
                    modifier = Modifier.weight(1f)
                ) {
                    Text("Blueprint starten")
                }
                
                OutlinedButton(
                    onClick = onViewTasks,
                    modifier = Modifier.weight(1f)
                ) {
                    Text("Tasks (${state.tasks.size})")
                }
            }
            
            // ── Blocked Question ──────────────────
            if (state is OrchestratorState.Blocked) {
                BlockedQuestionCard(
                    question = state.question,
                    options = state.options,
                    onResponse = onUserResponse
                )
            }
            
            // ── Active Tasks ──────────────────
            if (state is OrchestratorState.Monitoring && state.activeTasks.isNotEmpty()) {
                Text("Aktive Tasks", style = MaterialTheme.typography.titleMedium)
                
                state.activeTasks.forEach { task ->
                    TaskCard(task)
                }
            }
            
            // ── Agent Status ──────────────────
            Text("Agenten", style = MaterialTheme.typography.titleMedium)
            
            agents.forEach { agent ->
                AgentCard(agent)
            }
        }
    }
}

@Composable
private fun StatusCard(state: OrchestratorState) {
    val (title, subtitle, color) = when (state) {
        is OrchestratorState.Idle -> Triple("Bereit", "Kein Blueprint geladen", MaterialTheme.colorScheme.surfaceVariant)
        is OrchestratorState.Planning -> Triple("Planung", "Tasks werden erstellt...", MaterialTheme.colorScheme.tertiaryContainer)
        is OrchestratorState.Dispatching -> Triple("Dispatching", "${state.pendingTasks.size} Tasks bereit", MaterialTheme.colorScheme.secondaryContainer)
        is OrchestratorState.Monitoring -> Triple("Aktiv", "${state.activeTasks.size} Tasks laufen", MaterialTheme.colorScheme.primaryContainer)
        is OrchestratorState.Reviewing -> Triple("Review", "Ergebnisse werden geprüft", MaterialTheme.colorScheme.tertiaryContainer)
        is OrchestratorState.Blocked -> Triple("⚠️ Blockiert", "Eingabe benötigt", MaterialTheme.colorScheme.errorContainer)
        is OrchestratorState.Completed -> Triple("✅ Fertig", state.summary, MaterialTheme.colorScheme.primaryContainer)
        is OrchestratorState.Failed -> Triple("❌ Fehler", state.error, MaterialTheme.colorScheme.errorContainer)
    }
    
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = color)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(title, style = MaterialTheme.typography.headlineSmall)
            Text(subtitle, style = MaterialTheme.typography.bodyMedium)
        }
    }
}

@Composable
private fun TaskCard(task: Task) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(task.title, style = MaterialTheme.typography.titleSmall)
                Spacer(modifier = Modifier.weight(1f))
                StatusBadge(task.status)
            }
            
            if (task.error != null) {
                Text(
                    "Fehler: ${task.error}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error
                )
            }
        }
    }
}

@Composable
private fun AgentCard(agent: Agent) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(agent.name, style = MaterialTheme.typography.titleSmall)
                Text(
                    agent.capabilities.joinToString(", "),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            
            AgentStatusBadge(agent.status)
        }
    }
}

@Composable
private fun StatusBadge(status: TaskStatus) {
    val (text, color) = when (status) {
        TaskStatus.QUEUED -> "Wartend" to MaterialTheme.colorScheme.surfaceVariant
        TaskStatus.DISPATCHING -> "Sendend" to MaterialTheme.colorScheme.secondaryContainer
        TaskStatus.WORKING -> "Läuft" to MaterialTheme.colorScheme.primaryContainer
        TaskStatus.REVIEWING -> "Review" to MaterialTheme.colorScheme.tertiaryContainer
        TaskStatus.DONE -> "Fertig" to MaterialTheme.colorScheme.primaryContainer
        TaskStatus.FAILED -> "Fehler" to MaterialTheme.colorScheme.errorContainer
        TaskStatus.BLOCKED -> "Blockiert" to MaterialTheme.colorScheme.errorContainer
        TaskStatus.CANCELLED -> "Abgebrochen" to MaterialTheme.colorScheme.surfaceVariant
    }
    
    Surface(
        shape = MaterialTheme.shapes.small,
        color = color
    ) {
        Text(
            text,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelSmall
        )
    }
}

@Composable
private fun AgentStatusBadge(status: AgentStatus) {
    val (text, color) = when (status) {
        AgentStatus.ONLINE -> "Online" to MaterialTheme.colorScheme.primaryContainer
        AgentStatus.OFFLINE -> "Offline" to MaterialTheme.colorScheme.surfaceVariant
        AgentStatus.RATE_LIMITED -> "Rate Limit" to MaterialTheme.colorScheme.errorContainer
        AgentStatus.ERROR -> "Fehler" to MaterialTheme.colorScheme.errorContainer
    }
    
    Surface(
        shape = MaterialTheme.shapes.small,
        color = color
    ) {
        Text(
            text,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelSmall
        )
    }
}

@Composable
private fun BlockedQuestionCard(
    question: String,
    options: List<String>,
    onResponse: (String) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                "Eingabe benötigt",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onErrorContainer
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                question,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onErrorContainer
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            
            options.forEach { option ->
                Button(
                    onClick = { onResponse(option) },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(option)
                }
                Spacer(modifier = Modifier.height(4.dp))
            }
        }
    }
}
