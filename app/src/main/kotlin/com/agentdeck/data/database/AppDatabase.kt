// SPDX-License-Identifier: MIT
package com.agentdeck.data.database

import androidx.room.*
import kotlinx.coroutines.flow.Flow

/**
 * Room database for persisting blueprints, tasks, and agent configurations.
 */
@Database(
    entities = [
        BlueprintEntity::class,
        TaskEntity::class,
        AgentEntity::class,
        ProjectEntity::class
    ],
    version = 1,
    exportSchema = true
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun blueprintDao(): BlueprintDao
    abstract fun taskDao(): TaskDao
    abstract fun agentDao(): AgentDao
    abstract fun projectDao(): ProjectDao
}

// ── Entities ──────────────────────────────────────────────

@Entity(tableName = "blueprints")
data class BlueprintEntity(
    @PrimaryKey val id: String,
    val projectId: String,
    val project: String,
    val goal: String,
    val nonGoal: String?,
    val constraints: String,  // JSON array
    val modules: String,      // JSON array
    val preferredFlow: String, // JSON array
    val createdAt: Long,
    val updatedAt: Long
)

@Entity(
    tableName = "tasks",
    foreignKeys = [
        ForeignKey(
            entity = BlueprintEntity::class,
            parentColumns = ["id"],
            childColumns = ["blueprintId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index("blueprintId"), Index("status")]
)
data class TaskEntity(
    @PrimaryKey val id: String,
    val blueprintId: String,
    val title: String,
    val description: String,
    val agentId: String,
    val priority: String,
    val status: String,
    val dependsOn: String,  // JSON array
    val timeoutSeconds: Int,
    val retryCount: Int,
    val maxRetries: Int,
    val result: String?,    // JSON object
    val error: String?,
    val createdAt: Long,
    val updatedAt: Long
)

@Entity(tableName = "agents")
data class AgentEntity(
    @PrimaryKey val id: String,
    val name: String,
    val capabilities: String,  // JSON array
    val bestFor: String,       // JSON array
    val configJson: String,    // JSON serialized AgentConfig
    val status: String,
    val isEnabled: Boolean,
    val createdAt: Long,
    val updatedAt: Long
)

@Entity(tableName = "projects")
data class ProjectEntity(
    @PrimaryKey val id: String,
    val name: String,
    val description: String,
    val createdAt: Long,
    val updatedAt: Long
)

// ── DAOs ──────────────────────────────────────────────

@Dao
interface BlueprintDao {
    @Query("SELECT * FROM blueprints WHERE projectId = :projectId")
    fun getForProject(projectId: String): Flow<List<BlueprintEntity>>
    
    @Query("SELECT * FROM blueprints WHERE id = :id")
    suspend fun getById(id: String): BlueprintEntity?
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(blueprint: BlueprintEntity)
    
    @Update
    suspend fun update(blueprint: BlueprintEntity)
    
    @Delete
    suspend fun delete(blueprint: BlueprintEntity)
}

@Dao
interface TaskDao {
    @Query("SELECT * FROM tasks WHERE blueprintId = :blueprintId ORDER BY createdAt")
    fun getForBlueprint(blueprintId: String): Flow<List<TaskEntity>>
    
    @Query("SELECT * FROM tasks WHERE status = :status")
    fun getByStatus(status: String): Flow<List<TaskEntity>>
    
    @Query("SELECT * FROM tasks WHERE id = :id")
    suspend fun getById(id: String): TaskEntity?
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(tasks: List<TaskEntity>)
    
    @Update
    suspend fun update(task: TaskEntity)
    
    @Query("UPDATE tasks SET status = :status, updatedAt = :updatedAt WHERE id = :taskId")
    suspend fun updateStatus(taskId: String, status: String, updatedAt: Long = System.currentTimeMillis())
    
    @Delete
    suspend fun delete(task: TaskEntity)
}

@Dao
interface AgentDao {
    @Query("SELECT * FROM agents WHERE isEnabled = 1")
    fun getEnabled(): Flow<List<AgentEntity>>
    
    @Query("SELECT * FROM agents")
    fun getAll(): Flow<List<AgentEntity>>
    
    @Query("SELECT * FROM agents WHERE id = :id")
    suspend fun getById(id: String): AgentEntity?
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(agent: AgentEntity)
    
    @Update
    suspend fun update(agent: AgentEntity)
    
    @Delete
    suspend fun delete(agent: AgentEntity)
}

@Dao
interface ProjectDao {
    @Query("SELECT * FROM projects ORDER BY updatedAt DESC")
    fun getAll(): Flow<List<ProjectEntity>>
    
    @Query("SELECT * FROM projects WHERE id = :id")
    suspend fun getById(id: String): ProjectEntity?
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(project: ProjectEntity)
    
    @Update
    suspend fun update(project: ProjectEntity)
    
    @Delete
    suspend fun delete(project: ProjectEntity)
}
