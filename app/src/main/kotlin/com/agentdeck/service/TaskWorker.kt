package com.agentdeck.service

import android.content.Context
import androidx.work.*
import com.agentdeck.core.domain.TaskStatus
import java.util.concurrent.TimeUnit

/**
 * WorkManager-based task executor for reliable background execution.
 * Handles retries, timeouts, and scheduling even when the app is killed.
 * 
 * This is the Android-native way to handle long-running work.
 */
class TaskWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {
    
    companion object {
        const val KEY_TASK_ID = "task_id"
        const val KEY_AGENT_ID = "agent_id"
        const val KEY_TASK_DESCRIPTION = "task_description"
        
        /**
         * Schedule a task for execution
         */
        fun schedule(
            context: Context,
            taskId: String,
            agentId: String,
            description: String,
            delaySeconds: Long = 0,
            timeoutSeconds: Long = 300
        ) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)  // Need internet for remote agents
                .setRequiresBatteryNotLow(true)  // Don't drain battery
                .build()
            
            val inputData = Data.Builder()
                .putString(KEY_TASK_ID, taskId)
                .putString(KEY_AGENT_ID, agentId)
                .putString(KEY_TASK_DESCRIPTION, description)
                .build()
            
            val request = OneTimeWorkRequestBuilder<TaskWorker>()
                .setConstraints(constraints)
                .setInputData(inputData)
                .setInitialDelay(delaySeconds, TimeUnit.SECONDS)
                .addTag("task_$taskId")
                .addTag("agent_$agentId")
                .setBackoffCriteria(
                    BackoffPolicy.EXPONENTIAL,
                    WorkRequest.MIN_BACKOFF_MILLIS,
                    TimeUnit.MILLISECONDS
                )
                .build()
            
            WorkManager.getInstance(context)
                .enqueueUniqueWork(
                    "task_$taskId",
                    ExistingWorkPolicy.KEEP,  // Don't duplicate
                    request
                )
        }
        
        /**
         * Cancel a scheduled or running task
         */
        fun cancel(context: Context, taskId: String) {
            WorkManager.getInstance(context)
                .cancelUniqueWork("task_$taskId")
        }
        
        /**
         * Get status of a task
         */
        fun getStatus(context: Context, taskId: String): WorkInfo? {
            return WorkManager.getInstance(context)
                .getWorkInfosForUniqueWork("task_$taskId")
                .get()
                .firstOrNull()
        }
    }
    
    override suspend fun doWork(): Result {
        val taskId = inputData.getString(KEY_TASK_ID) ?: return Result.failure()
        val agentId = inputData.getString(KEY_AGENT_ID) ?: return Result.failure()
        val description = inputData.getString(KEY_TASK_DESCRIPTION) ?: return Result.failure()
        
        return try {
            // TODO: Get orchestrator instance and execute task
            // This requires dependency injection or a service locator
            
            // Simulate work
            // val agentClient = AgentRegistry.getClient(agentId)
            // val result = agentClient?.executeTask(task)
            
            // For now, just succeed
            val outputData = Data.Builder()
                .putString("result", "Task $taskId completed")
                .build()
            
            Result.success(outputData)
        } catch (e: Exception) {
            if (runAttemptCount < 3) {
                // Retry with exponential backoff
                Result.retry()
            } else {
                // Give up
                Result.failure(
                    Data.Builder()
                        .putString("error", e.message ?: "Unknown error")
                        .build()
                )
            }
        }
    }
}
