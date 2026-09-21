package com.agentdeck.di

import com.agentdeck.agents.AgentClientFactory
import com.agentdeck.agents.api.AgentRegistry
import com.agentdeck.core.common.SecureKeyStore
import com.agentdeck.core.orchestration.Orchestrator
import com.agentdeck.data.database.AppDatabase
import com.agentdeck.data.repository.AgentRepository
import com.agentdeck.data.repository.BlueprintRepository
import com.agentdeck.data.repository.TaskRepository
import com.agentdeck.llm.api.LLMProvider
import com.agentdeck.llm.api.LLMProviderFactory
import com.agentdeck.ui.navigation.BlueprintEditorViewModel
import com.agentdeck.ui.navigation.DashboardViewModel
import com.agentdeck.ui.navigation.TaskGraphViewModel
import org.koin.android.ext.koin.androidContext
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module
import androidx.room.Room
import timber.log.Timber

val appModule = module {
    
    // ── Database ──────────────────────────────
    single {
        Room.databaseBuilder(
            androidContext(),
            AppDatabase::class.java,
            "agent_deck_db"
        ).fallbackToDestructiveMigration().build()
    }
    
    single { get<AppDatabase>().blueprintDao() }
    single { get<AppDatabase>().taskDao() }
    single { get<AppDatabase>().agentDao() }
    single { get<AppDatabase>().projectDao() }
    
    // ── Security ──────────────────────────────
    single { SecureKeyStore(androidContext()) }
    
    // ── Agent Registry ──────────────────────────────
    single<AgentRegistry> {
        val keyStore: SecureKeyStore = get()
        val registry = AgentClientFactory.createAll(keyStore)
        Timber.d("Agent Registry initialized with ${registry.getAllAgents().size} agents")
        registry
    }
    
    // ── LLM Provider ──────────────────────────────
    single<LLMProvider?> {
        val keyStore: SecureKeyStore = get()
        
        // Priority: Nvidia NIM > OpenAI > null (rule-based)
        val nvidiaKey = keyStore.getApiKey(SecureKeyStore.PROVIDER_NVIDIA_NIM)
        val openaiKey = keyStore.getApiKey(SecureKeyStore.PROVIDER_OPENAI)
        
        when {
            !nvidiaKey.isNullOrBlank() -> {
                Timber.d("Using Nvidia NIM as LLM provider")
                LLMProviderFactory.create(
                    androidContext(),
                    LLMProviderFactory.ProviderConfig.NvidiaNIM(
                        apiKey = nvidiaKey,
                        model = "meta/llama-3.1-8b-instruct"
                    )
                )
            }
            !openaiKey.isNullOrBlank() -> {
                Timber.d("Using OpenAI as LLM provider")
                LLMProviderFactory.create(
                    androidContext(),
                    LLMProviderFactory.ProviderConfig.OpenAI(
                        apiKey = openaiKey,
                        model = "gpt-4o-mini"
                    )
                )
            }
            else -> {
                Timber.d("No LLM provider configured, using rule-based orchestration")
                null
            }
        }
    }
    
    // ── Repositories ──────────────────────────────
    single { BlueprintRepository(get()) }
    single { TaskRepository(get()) }
    single { AgentRepository(get()) }
    
    // ── Orchestrator ──────────────────────────────
    single {
        val agentRegistry: AgentRegistry = get()
        val agentClients = agentRegistry.getAllAgents().associate { agent ->
            agent.id to (agentRegistry.getClient(agent.id) ?: error("Client not found for ${agent.id}"))
        }
        
        Orchestrator(
            llmProvider = get(),
            agentClients = agentClients
        )
    }
    
    // ── ViewModels ──────────────────────────────
    viewModel { DashboardViewModel(get()) }
    viewModel { BlueprintEditorViewModel(get(), get()) }
    viewModel { TaskGraphViewModel(get()) }
}
