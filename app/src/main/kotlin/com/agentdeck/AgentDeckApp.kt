// SPDX-License-Identifier: MIT
package com.agentdeck

import android.app.Application
import com.agentdeck.di.appModule
import org.koin.android.ext.koin.androidContext
import org.koin.android.ext.koin.androidLogger
import org.koin.core.context.startKoin
import timber.log.Timber

class AgentDeckApp : Application() {
    
    override fun onCreate() {
        super.onCreate()
        
        // Initialize Timber for logging
        if (BuildConfig.DEBUG) {
            Timber.plant(Timber.DebugTree())
        }
        
        // Initialize Koin for dependency injection
        startKoin {
            androidLogger()
            androidContext(this@AgentDeckApp)
            modules(appModule)
        }
        
        Timber.d("AgentDeck application started")
    }
}
