// SPDX-License-Identifier: MIT
package com.agentdeck.data.repository

import com.agentdeck.core.domain.*
import com.agentdeck.data.database.AgentDao
import com.agentdeck.data.database.AgentEntity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

class AgentRepository(
    private val dao: AgentDao
) {
    private val json = Json { ignoreUnknownKeys = true }
    
    fun getEnabled(): Flow<List<Agent>> {
        return dao.getEnabled().map { entities ->
            entities.map { it.toDomain() }
        }
    }
    
    fun getAll(): Flow<List<Agent>> {
        return dao.getAll().map { entities ->
            entities.map { it.toDomain() }
        }
    }
    
    suspend fun getById(id: String): Agent? {
        return dao.getById(id)?.toDomain()
    }
    
    suspend fun save(agent: Agent) {
        dao.insert(agent.toEntity())
    }
    
    suspend fun delete(agent: Agent) {
        dao.delete(agent.toEntity())
    }
    
    private fun Agent.toEntity(): AgentEntity {
        // Polymorph korrekt als AgentConfig encoden — nicht doppelt encoden
        val configJsonString = json.encodeToString<AgentConfig>(config)
        return AgentEntity(
            id = id,
            name = name,
            capabilities = json.encodeToString(capabilities),
            bestFor = json.encodeToString(bestFor),
            configJson = configJsonString,
            status = status.name,
            isEnabled = true,
            createdAt = System.currentTimeMillis(),
            updatedAt = System.currentTimeMillis()
        )
    }
    
    private fun AgentEntity.toDomain(): Agent {
        return Agent(
            id = id,
            name = name,
            capabilities = try { json.decodeFromString(capabilities) } catch (e: Exception) { emptyList() },
            bestFor = try { json.decodeFromString(bestFor) } catch (e: Exception) { emptyList() },
            status = try { AgentStatus.valueOf(status) } catch (e: Exception) { AgentStatus.OFFLINE },
            config = try { json.decodeFromString<AgentConfig>(configJson) } catch (e: Exception) {
                // Fallback falls alte Daten (doppelt encodiert) vorliegen
                try {
                    val inner = json.decodeFromString<String>(configJson)
                    json.decodeFromString<AgentConfig>(inner)
                } catch (_: Exception) {
                    AgentConfig.Custom(endpoint = "https://api.example.com")
                }
            }
        )
    }
}
