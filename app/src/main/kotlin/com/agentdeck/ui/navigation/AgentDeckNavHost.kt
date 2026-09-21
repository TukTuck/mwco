package com.agentdeck.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.agentdeck.core.domain.Agent
import com.agentdeck.core.domain.AgentConfig
import com.agentdeck.core.domain.AgentStatus
import com.agentdeck.core.orchestration.OrchestratorState
import com.agentdeck.ui.dashboard.DashboardScreen
import com.agentdeck.ui.settings.LLMSettingsScreen
import com.agentdeck.ui.blueprint.BlueprintEditorScreen
import com.agentdeck.ui.tasks.TaskGraphScreen
import org.koin.androidx.compose.koinViewModel
import androidx.compose.ui.platform.LocalContext

sealed class Screen(val route: String) {
    data object Dashboard : Screen("dashboard")
    data object Settings : Screen("settings")
    data object BlueprintEditor : Screen("blueprint_editor")
    data object TaskGraph : Screen("task_graph")
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
            
            // Default agents list for display
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
    }
}
