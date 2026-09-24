// SPDX-License-Identifier: MIT
package com.agentdeck.data.repository

import com.agentdeck.core.domain.Blueprint
import com.agentdeck.data.database.BlueprintDao
import com.agentdeck.data.database.BlueprintEntity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

class BlueprintRepository(
    private val dao: BlueprintDao
) {
    private val json = Json { ignoreUnknownKeys = true }
    
    fun getForProject(projectId: String): Flow<List<Blueprint>> {
        return dao.getForProject(projectId).map { entities ->
            entities.map { it.toDomain() }
        }
    }
    
    suspend fun getById(id: String): Blueprint? {
        return dao.getById(id)?.toDomain()
    }
    
    suspend fun save(blueprint: Blueprint) {
        dao.insert(blueprint.toEntity())
    }
    
    suspend fun delete(blueprint: Blueprint) {
        dao.delete(blueprint.toEntity())
    }
    
    private fun Blueprint.toEntity(): BlueprintEntity {
        // projectId aus metadata falls vorhanden, sonst "default" — MVP hat kein echtes Projekt-Konzept
        val effectiveProjectId = metadata["projectId"] ?: "default"
        return BlueprintEntity(
            id = id,
            projectId = effectiveProjectId,
            project = project,
            goal = goal,
            nonGoal = nonGoal,
            constraints = json.encodeToString(constraints),
            modules = json.encodeToString(modules),
            preferredFlow = json.encodeToString(preferredFlow),
            createdAt = System.currentTimeMillis(),
            updatedAt = System.currentTimeMillis()
        )
    }
    
    private fun BlueprintEntity.toDomain(): Blueprint {
        return Blueprint(
            id = id,
            project = project,
            goal = goal,
            nonGoal = nonGoal,
            constraints = try { json.decodeFromString(constraints) } catch (e: Exception) { emptyList() },
            modules = try { json.decodeFromString(modules) } catch (e: Exception) { emptyList() },
            preferredFlow = try { json.decodeFromString(preferredFlow) } catch (e: Exception) { emptyList() }
        )
    }
}
