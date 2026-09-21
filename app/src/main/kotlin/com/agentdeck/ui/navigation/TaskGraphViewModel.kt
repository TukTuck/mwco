package com.agentdeck.ui.navigation

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import com.agentdeck.core.domain.Task
import com.agentdeck.data.repository.TaskRepository
import kotlinx.coroutines.flow.collectLatest

class TaskGraphViewModel(
    private val taskRepository: TaskRepository
) : ViewModel() {
    
    var tasks by mutableStateOf<List<Task>>(emptyList())
        private set
    
    init {
        // For now, load tasks from a default blueprint
        // In production, this would be parameterized by blueprint ID
    }
    
    fun loadTasks(blueprintId: String) {
        // TODO: Use viewModelScope to collect flow
        // taskRepository.getForBlueprint(blueprintId).collectLatest {
        //     tasks = it
        // }
    }
}
