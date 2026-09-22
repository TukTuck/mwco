// SPDX-License-Identifier: MIT
package com.agentdeck.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.agentdeck.core.domain.Agent
import com.agentdeck.core.domain.AgentConfig
import com.agentdeck.core.domain.AgentStatus
import com.agentdeck.ui.agents.AgentConfigScreen
import com.agentdeck.ui.blueprint.BlueprintEditorScreen
import com.agentdeck.ui.dashboard.DashboardScreen
import com.agentdeck.ui.logs.LogEntry
import com.agentdeck.ui.logs.LogLevel
import com.agentdeck.ui.logs.LogViewerScreen
import com.agentdeck.ui.results.ResultViewerScreen
import com.agentdeck.ui.settings.LLMSettingsScreen
import com.agentdeck.ui.tasks.TaskGraphScreen
import org.koin.androidx.compose.koinViewModel

sealed class Screen(val route: String, val title: String) {
    data object Dashboard : Screen("dashboard", "Dashboard")
    data object Settings : Screen("settings", "LLM Settings")
    data object BlueprintEditor : Screen("blueprint_editor", "Blueprint Editor")
    data object TaskGraph : Screen("task_graph", "Tasks")
    data object AgentConfig : Screen("agent_config", "Agenten")
    data object Results : Screen("results", "Ergebnisse")
    data object Logs : Screen("logs", "Logs")
}

@Composable
fun AgentDeckNavHost(
    navController: NavHostController = rememberNavController()
) {
    NavHost(
        navController = navController,
        startDestination = Screen.Dashboard.route
    ) {
        composable(Screen.Dashboard.route) {
            val viewModel: DashboardViewModel = koinViewModel()
            val state by viewModel.stateFlow.collectAsState()

            val defaultAgents = listOf(
                Agent(
                    id = "arena_main",
                    name = "Arena AI",
                    capabilities = listOf("coding", "file_editing", "testing"),
                    bestFor = listOf("Android implementation", "code changes"),
                    status = AgentStatus.ONLINE,
                    config = AgentConfig.Arena()
                ),
                Agent(
                    id = "claude_review",
                    name = "Claude",
                    capabilities = listOf("architecture_review", "risk_analysis"),
                    bestFor = listOf("review", "planning"),
                    status = AgentStatus.ONLINE,
                    config = AgentConfig.Claude(apiKey = "")
                ),
                Agent(
                    id = "chatgpt_structuring",
                    name = "ChatGPT",
                    capabilities = listOf("json_design", "debugging"),
                    bestFor = listOf("protocol design", "structured output"),
                    status = AgentStatus.ONLINE,
                    config = AgentConfig.ChatGPT(apiKey = "")
                )
            )

            DashboardScreen(
                state = state,
                agents = defaultAgents,
                onStartBlueprint = { navController.navigate(Screen.BlueprintEditor.route) },
                onOpenSettings = { navController.navigate(Screen.Settings.route) },
                onViewTasks = { navController.navigate(Screen.TaskGraph.route) },
                onViewAgents = { navController.navigate(Screen.AgentConfig.route) },
                onViewResults = { navController.navigate(Screen.Results.route) },
                onViewLogs = { navController.navigate(Screen.Logs.route) },
                onUserResponse = { response -> viewModel.onUserResponse(response) }
            )
        }

        composable(Screen.Settings.route) {
            val context = LocalContext.current
            LLMSettingsScreen(
                context = context,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Screen.BlueprintEditor.route) {
            val viewModel: BlueprintEditorViewModel = koinViewModel()
            BlueprintEditorScreen(
                blueprint = viewModel.blueprint,
                onSave = { text -> viewModel.saveBlueprint(text) },
                onStart = { viewModel.startOrchestration() },
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Screen.TaskGraph.route) {
            val viewModel: TaskGraphViewModel = koinViewModel()
            TaskGraphScreen(
                tasks = viewModel.tasks,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Screen.AgentConfig.route) {
            AgentConfigScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Screen.Results.route) {
            val viewModel: DashboardViewModel = koinViewModel()
            val state by viewModel.stateFlow.collectAsState()
            ResultViewerScreen(
                tasks = state.tasks,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Screen.Logs.route) {
            // Demo-Logs für jetzt – später aus ViewModel/Repository
            val demoLogs = listOf(
                LogEntry(System.currentTimeMillis(), LogLevel.INFO, "Orchestrator", "Orchestrierung gestartet"),
                LogEntry(System.currentTimeMillis() - 1000, LogLevel.INFO, "LLM", "Task-Decomposition via Nvidia NIM"),
                LogEntry(System.currentTimeMillis() - 2000, LogLevel.DEBUG, "Parser", "3 Tasks aus Blueprint extrahiert"),
                LogEntry(System.currentTimeMillis() - 3000, LogLevel.INFO, "Dispatcher", "Task 1 an Claude dispatched"),
                LogEntry(System.currentTimeMillis() - 5000, LogLevel.WARN, "RateLimiter", "80% des Rate-Limits erreicht"),
                LogEntry(System.currentTimeMillis() - 8000, LogLevel.INFO, "Claude", "Task 1 abgeschlossen (12s, 2340 Tokens)"),
                LogEntry(System.currentTimeMillis() - 10000, LogLevel.ERROR, "ChatGPT", "HTTP 429: Rate limit exceeded"),
                LogEntry(System.currentTimeMillis() - 12000, LogLevel.INFO, "Orchestrator", "Retry Task 2 (Versuch 1/3)"),
            )
            LogViewerScreen(
                logs = demoLogs,
                onNavigateBack = { navController.popBackStack() }
            )
        }
    }
}
