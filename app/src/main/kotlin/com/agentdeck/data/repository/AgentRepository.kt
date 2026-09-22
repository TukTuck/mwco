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
        return AgentEntity(
            id = id,
            name = name,
            capabilities = json.encodeToString(capabilities),
            bestFor = json.encodeToString(bestFor),
            configJson = json.encodeToString(config.toJsonString()),
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
            config = AgentConfig.Custom(endpoint = "https://api.example.com")  // TODO: Parse configJson
        )
    }
    
    private fun AgentConfig.toJsonString(): String {
        return when (this) {
            is AgentConfig.Arena -> json.encodeToString(this)
            is AgentConfig.Claude -> json.encodeToString(this)
            is AgentConfig.ChatGPT -> json.encodeToString(this)
            is AgentConfig.WebSocket -> json.encodeToString(this)
            is AgentConfig.Custom -> json.encodeToString(this)
        }
    }
}
