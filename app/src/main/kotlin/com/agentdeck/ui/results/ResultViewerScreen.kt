// SPDX-License-Identifier: MIT
package com.agentdeck.ui.results

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.agentdeck.core.domain.ResultType
import com.agentdeck.core.domain.Task
import com.agentdeck.core.domain.TaskStatus

/**
 * Result Viewer Screen
 * 
 * Zeigt Ergebnisse von abgeschlossenen Tasks an.
 * Unterstützt verschiedene Result-Typen: Code, JSON, Text, File-Pfade.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ResultViewerScreen(
    tasks: List<Task>,
    onNavigateBack: () -> Unit
) {
    val completedTasks = tasks.filter { it.status == TaskStatus.DONE && it.result != null }
    var selectedTask by remember { mutableStateOf<Task?>(completedTasks.firstOrNull()) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Ergebnisse") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Zurück")
                    }
                }
            )
        }
    ) { padding ->
        if (completedTasks.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    "Keine Ergebnisse vorhanden",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Task Selector
                Text("Task auswählen", style = MaterialTheme.typography.titleMedium)
                
                completedTasks.forEach { task ->
                    FilterChip(
                        selected = selectedTask?.id == task.id,
                        onClick = { selectedTask = task },
                        label = { Text(task.title) }
                    )
                }

                // Result Display
                selectedTask?.let { task ->
                    task.result?.let { result ->
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Column(
                                modifier = Modifier.padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        task.title,
                                        style = MaterialTheme.typography.titleLarge
                                    )
                                    ResultTypeBadge(result.type)
                                }

                                Divider()

                                when (result.type) {
                                    ResultType.CODE -> CodeResult(result.content)
                                    ResultType.JSON -> JsonResult(result.content)
                                    ResultType.TEXT -> TextResult(result.content)
                                    ResultType.FILE -> FileResult(result.content)
                                    ResultType.ERROR -> ErrorResult(result.content)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ResultTypeBadge(type: ResultType) {
    val color = when (type) {
        ResultType.CODE -> MaterialTheme.colorScheme.primaryContainer
        ResultType.JSON -> MaterialTheme.colorScheme.secondaryContainer
        ResultType.TEXT -> MaterialTheme.colorScheme.tertiaryContainer
        ResultType.FILE -> MaterialTheme.colorScheme.surfaceVariant
        ResultType.ERROR -> MaterialTheme.colorScheme.errorContainer
    }
    
    Surface(
        shape = MaterialTheme.shapes.small,
        color = color
    ) {
        Text(
            type.name,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelSmall
        )
    }
}

@Composable
private fun CodeResult(content: String) {
    val clipboardManager = LocalClipboardManager.current
    
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.End
        ) {
            IconButton(onClick = { 
                clipboardManager.setText(AnnotatedString(content))
            }) {
                Icon(Icons.Default.ContentCopy, "Code kopieren")
            }
        }
        
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            color = MaterialTheme.colorScheme.surfaceVariant,
            shape = MaterialTheme.shapes.medium
        ) {
            Text(
                text = content,
                modifier = Modifier.padding(16.dp),
                fontFamily = FontFamily.Monospace,
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun JsonResult(content: String) {
    val clipboardManager = LocalClipboardManager.current
    
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.End
        ) {
            IconButton(onClick = { 
                clipboardManager.setText(AnnotatedString(content))
            }) {
                Icon(Icons.Default.ContentCopy, "JSON kopieren")
            }
        }
        
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState()),
            color = MaterialTheme.colorScheme.surfaceVariant,
            shape = MaterialTheme.shapes.medium
        ) {
            Text(
                text = content,
                modifier = Modifier.padding(16.dp),
                fontFamily = FontFamily.Monospace,
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun TextResult(content: String) {
    val clipboardManager = LocalClipboardManager.current
    
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.End
        ) {
            IconButton(onClick = { 
                clipboardManager.setText(AnnotatedString(content))
            }) {
                Icon(Icons.Default.ContentCopy, "Text kopieren")
            }
        }
        
        Text(
            text = content,
            modifier = Modifier.fillMaxWidth(),
            style = MaterialTheme.typography.bodyLarge
        )
    }
}

@Composable
private fun FileResult(content: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text("Datei erstellt", style = MaterialTheme.typography.titleSmall)
            Text(
                content,
                fontFamily = FontFamily.Monospace,
                style = MaterialTheme.typography.bodyMedium
            )
        }
    }
}

@Composable
private fun ErrorResult(content: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.errorContainer
        )
    ) {
        Text(
            content,
            modifier = Modifier.padding(16.dp),
            color = MaterialTheme.colorScheme.onErrorContainer
        )
    }
}
