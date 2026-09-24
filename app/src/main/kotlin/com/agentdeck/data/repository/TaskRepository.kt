// SPDX-License-Identifier: MIT
package com.agentdeck.data.repository

import com.agentdeck.core.domain.*
import com.agentdeck.data.database.TaskDao
import com.agentdeck.data.database.TaskEntity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

class TaskRepository(
    private val dao: TaskDao
) {
    private val json = Json { ignoreUnknownKeys = true }
    
    fun getForBlueprint(blueprintId: String): Flow<List<Task>> {
        return dao.getForBlueprint(blueprintId).map { entities ->
            entities.map { it.toDomain() }
        }
    }
    
    fun getByStatus(status: TaskStatus): Flow<List<Task>> {
        return dao.getByStatus(status.name).map { entities ->
            entities.map { it.toDomain() }
        }
    }
    
    suspend fun getById(id: String): Task? {
        return dao.getById(id)?.toDomain()
    }
    
    suspend fun saveAll(tasks: List<Task>) {
        dao.insertAll(tasks.map { it.toEntity() })
    }
    
    suspend fun update(task: Task) {
        dao.update(task.toEntity())
    }
    
    suspend fun updateStatus(taskId: String, status: TaskStatus) {
        dao.updateStatus(taskId, status.name)
    }
    
    suspend fun delete(task: Task) {
        dao.delete(task.toEntity())
    }
    
    private fun Task.toEntity(): TaskEntity {
        return TaskEntity(
            id = id,
            blueprintId = "default",  // TODO: Pass blueprintId
            title = title,
            description = description,
            agentId = agentId,
            priority = priority.name,
            status = status.name,
            dependsOn = json.encodeToString(dependsOn),
            timeoutSeconds = timeoutSeconds,
            retryCount = retryCount,
            maxRetries = maxRetries,
            result = result?.let { json.encodeToString(it) },
            error = error,
            createdAt = createdAt,
            updatedAt = updatedAt
        )
    }
    
    private fun TaskEntity.toDomain(): Task {
        return Task(
            id = id,
            title = title,
            description = description,
            agentId = agentId,
            priority = try { Priority.valueOf(priority) } catch (e: Exception) { Priority.MEDIUM },
            status = try { TaskStatus.valueOf(status) } catch (e: Exception) { TaskStatus.QUEUED },
            dependsOn = try { json.decodeFromString(dependsOn) } catch (e: Exception) { emptyList() },
            timeoutSeconds = timeoutSeconds,
            retryCount = retryCount,
            maxRetries = maxRetries,
            result = result?.let { try { json.decodeFromString(it) } catch (e: Exception) { null } },
            error = error,
            createdAt = createdAt,
            updatedAt = updatedAt
        )
    }
}
