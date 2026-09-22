// SPDX-License-Identifier: MIT
package com.agentdeck.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.State
import androidx.compose.runtime.collectAsState
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.agentdeck.core.domain.Agent
import com.agentdeck.core.orchestration.Orchestrator
import com.agentdeck.core.orchestration.OrchestratorState
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.stateIn

class DashboardViewModel(
    private val orchestrator: Orchestrator
) : ViewModel() {
    
    val stateFlow = orchestrator.state
    
    fun onUserResponse(response: String) {
        orchestrator.onUserResponse(response)
    }
}
