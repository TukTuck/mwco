// SPDX-License-Identifier: MIT
package com.agentdeck.service

import android.app.*
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.agentdeck.core.orchestration.Orchestrator
import com.agentdeck.core.orchestration.OrchestratorState
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.collectLatest

/**
 * Foreground Service that keeps the orchestrator running even when the app is in background.
 *
 * ## Warum Foreground Service?
 * Android killt Background-Prozesse aggressiv:
 * - Doze Mode (nach ~30 Min Screen-Off)
 * - App Standby (wenn App nicht genutzt wird)
 * - Memory Pressure (wenn RAM knapp wird)
 *
 * Foreground Service mit Notification = Android behandelt die App als "wichtig"
 * und killt sie nur im Extremfall (sehr wenig RAM).
 *
 * ## Notification-Updates:
 * Die Notification zeigt den aktuellen Orchestrierungs-Status:
 * - "Tasks aktiv" + Anzahl
 * - "⚠️ Eingabe benötigt" bei Blockaden
 * - "✅ Fertig" bei Abschluss
 * - "❌ Fehler" bei Fehlschlag
 *
 * ## Lifecycle:
 * - [ACTION_START]: Startet den Service + Foreground-Notification
 * - [ACTION_PAUSE]: Pausiert die Orchestrierung (Tasks bleiben im State)
 * - [ACTION_STOP]: Stoppt den Service komplett
 */
class OrchestrationService : Service() {
    
    companion object {
        const val NOTIFICATION_CHANNEL_ID = "orchestration_channel"
        const val NOTIFICATION_ID = 1001
        
        const val ACTION_START = "com.agentdeck.START_ORCHESTRATION"
        const val ACTION_STOP = "com.agentdeck.STOP_ORCHESTRATION"
        const val ACTION_PAUSE = "com.agentdeck.PAUSE_ORCHESTRATION"
    }
    
    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var orchestrator: Orchestrator? = null
    private var isRunning = false
    
    override fun onBind(intent: Intent?): IBinder? = null
    
    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> startOrchestration()
            ACTION_STOP -> stopOrchestration()
            ACTION_PAUSE -> pauseOrchestration()
        }
        
        return START_STICKY  // Restart if killed
    }
    
    private fun startOrchestration() {
        if (isRunning) return
        
        val notification = buildNotification("Orchestrator läuft", "Überwache Agenten...")
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
        
        isRunning = true
        
        // Monitor orchestrator state and update notification
        serviceScope.launch {
            orchestrator?.state?.collectLatest { state ->
                val notification = when (state) {
                    is OrchestratorState.Monitoring -> buildNotification(
                        "Tasks aktiv",
                        "${state.activeTasks.size} Tasks laufen"
                    )
                    is OrchestratorState.Blocked -> buildNotification(
                        "⚠️ Eingabe benötigt",
                        state.question
                    )
                    is OrchestratorState.Completed -> buildNotification(
                        "✅ Fertig",
                        state.summary
                    )
                    is OrchestratorState.Failed -> buildNotification(
                        "❌ Fehler",
                        state.error
                    )
                    else -> buildNotification("Orchestrator läuft", "Bereit")
                }
                
                val notificationManager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
                notificationManager.notify(NOTIFICATION_ID, notification)
            }
        }
    }
    
    private fun stopOrchestration() {
        isRunning = false
        serviceScope.cancel()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }
    
    private fun pauseOrchestration() {
        // TODO: Implement pause logic
        val notification = buildNotification("⏸ Pausiert", "Orchestrierung pausiert")
        val notificationManager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(NOTIFICATION_ID, notification)
    }
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "Agent Orchestrierung",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Status der Agenten-Orchestrierung"
                setShowBadge(false)
            }
            
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }
    
    private fun buildNotification(title: String, text: String): Notification {
        val pendingIntent = packageManager.getLaunchIntentForPackage(packageName)?.let {
            PendingIntent.getActivity(this, 0, it, PendingIntent.FLAG_IMMUTABLE)
        }
        
        return NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_menu_manage)  // TODO: Custom icon
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }
    
    override fun onDestroy() {
        super.onDestroy()
        serviceScope.cancel()
    }
}
