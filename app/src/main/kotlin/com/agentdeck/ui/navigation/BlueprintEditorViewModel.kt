package com.agentdeck.ui.navigation

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.agentdeck.core.domain.Blueprint
import com.agentdeck.core.orchestration.Orchestrator
import com.agentdeck.data.repository.BlueprintRepository
import kotlinx.coroutines.launch
import java.util.UUID

class BlueprintEditorViewModel(
    private val blueprintRepository: BlueprintRepository,
    private val orchestrator: Orchestrator
) : ViewModel() {
    
    var blueprint by mutableStateOf("")
        private set
    
    var isSaving by mutableStateOf(false)
        private set
    
    var errorMessage by mutableStateOf<String?>(null)
        private set
    
    fun updateBlueprint(text: String) {
        blueprint = text
    }
    
    fun saveBlueprint(text: String) {
        viewModelScope.launch {
            isSaving = true
            errorMessage = null
            
            try {
                val parsed = parseBlueprintFromText(text)
                blueprintRepository.save(parsed)
                blueprint = text
            } catch (e: Exception) {
                errorMessage = "Fehler beim Speichern: ${e.message}"
            } finally {
                isSaving = false
            }
        }
    }
    
    fun startOrchestration() {
        viewModelScope.launch {
            try {
                val parsed = parseBlueprintFromText(blueprint)
                orchestrator.start(parsed)
            } catch (e: Exception) {
                errorMessage = "Fehler beim Starten: ${e.message}"
            }
        }
    }
    
    /**
     * Parse a free-text blueprint into a structured Blueprint object.
     * Looks for known sections: Projekt, Ziel, Nicht-Ziel, Technologie, Kernmodule, Ablauf
     */
    private fun parseBlueprintFromText(text: String): Blueprint {
        val lines = text.lines().map { it.trim() }.filter { it.isNotBlank() }
        
        var project = "Unbenanntes Projekt"
        var goal = ""
        var nonGoal: String? = null
        val constraints = mutableListOf<String>()
        val modules = mutableListOf<String>()
        val flow = mutableListOf<String>()
        
        var currentSection = ""
        
        for (line in lines) {
            when {
                line.startsWith("Projekt:", ignoreCase = true) -> {
                    project = line.substringAfter(":").trim()
                    currentSection = "projekt"
                }
                line.startsWith("Ziel:", ignoreCase = true) -> {
                    goal = line.substringAfter(":").trim()
                    currentSection = "ziel"
                }
                line.startsWith("Nicht-Ziel:", ignoreCase = true) -> {
                    nonGoal = line.substringAfter(":").trim()
                    currentSection = "nichtziel"
                }
                line.startsWith("Technologie:", ignoreCase = true) || 
                line.startsWith("Constraints:", ignoreCase = true) -> {
                    currentSection = "constraints"
                }
                line.startsWith("Kernmodule:", ignoreCase = true) || 
                line.startsWith("Module:", ignoreCase = true) -> {
                    currentSection = "modules"
                }
                line.startsWith("Ablauf:", ignoreCase = true) || 
                line.startsWith("Flow:", ignoreCase = true) -> {
                    currentSection = "flow"
                }
                line.startsWith("-") || line.startsWith("•") -> {
                    val item = line.removePrefix("-").removePrefix("•").trim()
                    when (currentSection) {
                        "constraints" -> constraints.add(item)
                        "modules" -> modules.add(item)
                        "flow" -> flow.add(item)
                    }
                }
                line.contains("→") || line.contains("->") -> {
                    val parts = line.split("→", "->").map { it.trim() }
                    flow.addAll(parts)
                }
            }
        }
        
        // Fallback: if no goal found, use the whole text
        if (goal.isBlank()) {
            goal = text.take(500)
        }
        
        return Blueprint(
            id = UUID.randomUUID().toString(),
            project = project,
            goal = goal,
            nonGoal = nonGoal,
            constraints = constraints,
            modules = modules,
            preferredFlow = flow
        )
    }
}
