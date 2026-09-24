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

            // Keine Demo-Daten mehr — Agents kommen aus Registry, leer bis echte Keys konfiguriert
            val defaultAgents = emptyList<Agent>()

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
            // Keine Demo-Logs mehr — leer bis echte Logs vorhanden
            val demoLogs = emptyList<LogEntry>()
            LogViewerScreen(
                logs = demoLogs,
                onNavigateBack = { navController.popBackStack() }
            )
        }
    }
}
