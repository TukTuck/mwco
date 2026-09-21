# Agent Deck PC-Bridge – WebSocket-Protokoll

## Übersicht

Die PC-Bridge ist ein WebSocket-Server der auf dem Windows-PC läuft.
Die Android-App verbindet sich und sendet Tasks zur Ausführung.

## Verbindung

```
Android App  ──WebSocket──▶  PC-Bridge (ws://pc-ip:8765)
```

## Authentifizierung

Nach dem Connect sendet die App einen Auth-Frame:

```json
{
  "type": "auth",
  "task_id": "",
  "payload": {
    "token": "shared-secret-token"
  }
}
```

Die Bridge antwortet:

```json
{
  "type": "auth_ok",
  "task_id": "",
  "payload": {
    "bridge_version": "0.1.0",
    "platform": "win32",
    "hostname": "DESKTOP-ABC123",
    "capabilities": ["terminal", "filesystem", "git", "code_exec"]
  }
}
```

## Task-Request

Die App sendet einen Task:

```json
{
  "type": "task_request",
  "task_id": "task_001",
  "payload": {
    "title": "Erstelle Kotlin-Datei",
    "description": "Erstelle die Datei MainActivity.kt im Projekt",
    "priority": "HIGH",
    "timeout_seconds": 300,
    "actions": [
      {
        "type": "terminal",
        "command": "mkdir -p src/main/kotlin/com/example",
        "cwd": "/home/user/project"
      },
      {
        "type": "write_file",
        "path": "src/main/kotlin/com/example/MainActivity.kt",
        "content": "package com.example\n\nclass MainActivity { ... }"
      },
      {
        "type": "terminal",
        "command": "git add . && git status",
        "cwd": "/home/user/project"
      }
    ]
  }
}
```

## Progress-Updates

Die Bridge sendet Fortschritt:

```json
{
  "type": "progress",
  "task_id": "task_001",
  "payload": {
    "action_index": 0,
    "message": "Führe Terminal-Befehl aus: mkdir -p ...",
    "stdout": "",
    "stderr": ""
  }
}
```

## Ergebnis

```json
{
  "type": "result",
  "task_id": "task_001",
  "payload": {
    "success": true,
    "content": "3 Aktionen erfolgreich ausgeführt",
    "type": "TEXT",
    "details": [
      {
        "action": "terminal",
        "success": true,
        "stdout": "",
        "stderr": "",
        "exitCode": 0
      },
      {
        "action": "write_file",
        "success": true,
        "bytesWritten": 245
      },
      {
        "action": "terminal",
        "success": true,
        "stdout": "On branch main\nChanges to be committed:\n  new file: src/main/kotlin/com/example/MainActivity.kt",
        "stderr": "",
        "exitCode": 0
      }
    ]
  }
}
```

## Fehler

```json
{
  "type": "error",
  "task_id": "task_001",
  "payload": {
    "error": "Permission denied: /root/.ssh",
    "action_index": 1,
    "details": "Pfad ist in der Blocked-Liste"
  }
}
```

## Aktionstypen

### `terminal` – Shell-Befehl ausführen
```json
{
  "type": "terminal",
  "command": "npm install",
  "cwd": "/home/user/project",
  "timeout": 60000,
  "env": { "NODE_ENV": "production" }
}
```

### `write_file` – Datei schreiben
```json
{
  "type": "write_file",
  "path": "src/App.kt",
  "content": "class App { ... }",
  "cwd": "/home/user/project"
}
```

### `read_file` – Datei lesen
```json
{
  "type": "read_file",
  "path": "src/App.kt",
  "cwd": "/home/user/project"
}
```

### `list_files` – Verzeichnis auflisten
```json
{
  "type": "list_files",
  "path": "src/",
  "recursive": false,
  "cwd": "/home/user/project"
}
```

### `search_files` – Dateien durchsuchen (grep)
```json
{
  "type": "search_files",
  "pattern": "TODO",
  "path": "src/",
  "cwd": "/home/user/project"
}
```

### `git` – Git-Operation
```json
{
  "type": "git",
  "action": "status",
  "cwd": "/home/user/project"
}
```

### `ask_user` – Rückfrage an den PC-Nutzer
```json
{
  "type": "ask_user",
  "question": "Soll die Datei überschrieben werden?",
  "options": ["Ja", "Nein"]
}
```

## Discovery (mDNS)

Die Bridge advertised sich im LAN:

```
Service: agent-deck-bridge._agentdeck._tcp.local
Port: 8765
TXT: version=0.1.0, platform=win32
```

Die Android-App entdeckt die Bridge automatisch im gleichen Netzwerk.
