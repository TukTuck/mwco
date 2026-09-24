// SPDX-License-Identifier: MIT
package com.agentdeck.ui.tasks

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.agentdeck.core.domain.*

/**
 * Task Graph Screen.
 * Shows all tasks with their dependencies and status.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TaskGraphScreen(
    tasks: List<Task>,
    onNavigateBack: () -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Task Graph (${tasks.size})") },
                navigationIcon = {
                    TextButton(onClick = onNavigateBack) {
                        Text("←")
                    }
                }
            )
        }
    ) { padding ->
        if (tasks.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        "Keine Tasks",
                        style = MaterialTheme.typography.headlineSmall
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "Starte einen Blueprint um Tasks zu erzeugen.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(tasks) { task ->
                    TaskGraphCard(task, tasks)
                }
            }
        }
    }
}

@Composable
private fun TaskGraphCard(task: Task, allTasks: List<Task>) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        task.title,
                        style = MaterialTheme.typography.titleSmall
                    )
                    Text(
                        "Agent: ${task.agentId}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                
                TaskStatusChip(task.status)
            }
            
            if (task.description.isNotBlank()) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    task.description,
                    style = MaterialTheme.typography.bodySmall
                )
            }
            
            // Show dependencies
            if (task.dependsOn.isNotEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    "Hängt ab von:",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                
                task.dependsOn.forEach { depId ->
                    val depTask = allTasks.find { it.id == depId }
                    Text(
                        "  → ${depTask?.title ?: depId} (${depTask?.status?.name ?: "?"})",
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
            
            // Show error if failed
            if (task.error != null) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    "❌ ${task.error}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error
                )
            }
            
            // Show retry info
            if (task.retryCount > 0) {
                Text(
                    "Retry: ${task.retryCount}/${task.maxRetries}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.tertiary
                )
            }
        }
    }
}

@Composable
private fun TaskStatusChip(status: TaskStatus) {
    val (text, color) = when (status) {
        TaskStatus.QUEUED -> "Wartend" to MaterialTheme.colorScheme.surfaceVariant
        TaskStatus.DISPATCHING -> "Sendend" to MaterialTheme.colorScheme.secondaryContainer
        TaskStatus.WORKING -> "🔄 Läuft" to MaterialTheme.colorScheme.primaryContainer
        TaskStatus.REVIEWING -> "Review" to MaterialTheme.colorScheme.tertiaryContainer
        TaskStatus.DONE -> "✅ Fertig" to MaterialTheme.colorScheme.primaryContainer
        TaskStatus.FAILED -> "❌ Fehler" to MaterialTheme.colorScheme.errorContainer
        TaskStatus.BLOCKED -> "⚠️ Blockiert" to MaterialTheme.colorScheme.errorContainer
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
