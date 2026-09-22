// SPDX-License-Identifier: MIT
/**
 * PaulPanel – Chat-Interface für Paul.
 *
 * Kommuniziert über IPC mit der PaulEngine im Main Process.
 * Features:
 * - Chat-History mit Thinking-Anzeige
 * - Spracheingabe (wenn Whisper verfügbar)
 * - Sprachausgabe (wenn Piper verfügbar)
 * - Tool-Aufrufe werden angezeigt
 */

import React, { useState, useRef, useEffect } from 'react';

interface PaulMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  thinking?: string;
  timestamp: number;
  durationMs?: number;
}

const api = (window as any).agentDeck;

export function PaulPanel() {
  const [messages, setMessages] = useState<PaulMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [thinkingMsg, setThinkingMsg] = useState<string | null>(null);
  const [showThinking, setShowThinking] = useState<Record<number, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  // History beim Start laden
  useEffect(() => {
    if (api?.paul) {
      api.paul.getHistory().then((history: PaulMessage[]) => {
        // System-Prompt nicht anzeigen
        setMessages(history.filter((m) => m.role !== 'system'));
      });

      api.paul.onThinking((msg: string) => setThinkingMsg(msg));
      api.paul.onMessage((msg: PaulMessage) => {
        setMessages((prev) => [...prev, msg]);
        setThinkingMsg(null);
        setIsLoading(false);
      });
    }
  }, []);

  // Auto-Scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, thinkingMsg]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: PaulMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await api?.paul?.chat(userMsg.content);
      if (response) {
        setMessages((prev) => [...prev, response]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Fehler: ${(err as Error).message}`, timestamp: Date.now() },
      ]);
    } finally {
      setIsLoading(false);
      setThinkingMsg(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = async () => {
    await api?.paul?.clearHistory();
    setMessages([]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ── Header ────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '11px', color: '#666' }}>
          {messages.length} Nachrichten
        </span>
        <button
          onClick={handleClear}
          style={{
            padding: '2px 8px',
            fontSize: '11px',
            border: '1px solid #333',
            borderRadius: '4px',
            backgroundColor: 'transparent',
            color: '#888',
            cursor: 'pointer',
          }}
        >
          Löschen
        </button>
      </div>

      {/* ── Messages ────────────────────────── */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflow: 'auto',
          fontSize: '13px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {messages.length === 0 && (
          <div style={{ color: '#555', textAlign: 'center', padding: '20px', fontSize: '12px' }}>
            Hallo! Ich bin Paul, dein Allrounder-Assistent.<br />
            Ich kann Dateien lesen/schreiben, Terminal-Befehle ausführen und Git-Operationen durchführen.
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i}>
            <div
              style={{
                padding: '8px 12px',
                backgroundColor: msg.role === 'user' ? '#1a2744' : '#1a1a1a',
                borderRadius: '8px',
                borderLeft: `3px solid ${msg.role === 'user' ? '#3b82f6' : '#22c55e'}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: msg.role === 'user' ? '#3b82f6' : '#22c55e',
                  }}
                >
                  {msg.role === 'user' ? 'Du' : msg.role === 'tool' ? 'Tool' : 'Paul'}
                </span>
                {msg.durationMs && (
                  <span style={{ fontSize: '10px', color: '#555' }}>{msg.durationMs}ms</span>
                )}
              </div>
              <div style={{ color: '#ccc', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {msg.content}
              </div>
            </div>

            {/* Thinking Toggle */}
            {msg.thinking && (
              <div style={{ marginTop: '4px' }}>
                <button
                  onClick={() => setShowThinking((prev) => ({ ...prev, [i]: !prev[i] }))}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#666',
                    fontSize: '10px',
                    cursor: 'pointer',
                    padding: '2px 4px',
                  }}
                >
                  {showThinking[i] ? '▾' : '▸'} Thinking
                </button>
                {showThinking[i] && (
                  <div
                    style={{
                      padding: '6px 10px',
                      backgroundColor: '#0f0f0f',
                      borderRadius: '4px',
                      fontSize: '11px',
                      color: '#888',
                      fontStyle: 'italic',
                      marginTop: '2px',
                    }}
                  >
                    {msg.thinking}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Thinking Indicator */}
        {isLoading && thinkingMsg && (
          <div style={{ padding: '8px 12px', color: '#888', fontSize: '12px', fontStyle: 'italic' }}>
            ⏳ {thinkingMsg}
          </div>
        )}
        {isLoading && !thinkingMsg && (
          <div style={{ padding: '8px 12px', color: '#888', fontSize: '12px' }}>
            ⏳ Paul denkt nach...
          </div>
        )}
      </div>

      {/* ── Input ────────────────────────── */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nachricht an Paul..."
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #333',
            backgroundColor: '#1a1a1a',
            color: '#e0e0e0',
            fontSize: '13px',
            outline: 'none',
            fontFamily: 'Inter, system-ui, sans-serif',
            opacity: isLoading ? 0.5 : 1,
          }}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: isLoading ? '#1a1a1a' : '#3b82f6',
            color: 'white',
            fontSize: '13px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          Senden
        </button>
      </div>
    </div>
  );
}
