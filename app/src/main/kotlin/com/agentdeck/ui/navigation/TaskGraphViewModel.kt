// SPDX-License-Identifier: MIT
package com.agentdeck.ui.navigation

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.agentdeck.core.domain.Task
import com.agentdeck.data.repository.TaskRepository
import kotlinx.coroutines.launch

class TaskGraphViewModel(
    private val taskRepository: TaskRepository
) : ViewModel() {
    
    var tasks by mutableStateOf<List<Task>>(emptyList())
        private set
    
    var isLoading by mutableStateOf(false)
        private set
    
    var currentBlueprintId by mutableStateOf<String?>(null)
        private set
    
    fun loadTasks(blueprintId: String) {
        currentBlueprintId = blueprintId
        viewModelScope.launch {
            isLoading = true
            try {
                taskRepository.getForBlueprint(blueprintId).collect { result ->
                    tasks = result
                }
            } finally {
                isLoading = false
            }
        }
    }
}
