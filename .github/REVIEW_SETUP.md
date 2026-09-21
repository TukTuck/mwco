# 🤖 AI Code Review – Setup Guide

Dieses Repo hat automatische AI-Code-Reviews für jeden Pull Request.

## 3 Optionen – Wähle eine

### Option A: Ollama über Tailscale (empfohlen wenn VM erreichbar)
1. Datei `.github/workflows/code-review-tailscale.yml` → umbenennen zu `code-review.yml`
2. GitHub Secrets setzen:
   - `OLLAMA_URL` → `http://<deine-tailscale-ip>:11434/v1`
   - `OLLAMA_MODEL` → `qwen2.5-coder:32b`
   - `TAILSCALE_CLIENT_ID` → Tailscale OAuth Client ID
   - `TAILSCALE_CLIENT_SECRET` → Tailscale OAuth Secret
3. Andere YAML-Dateien löschen

### Option B: Self-hosted Runner (empfohlen, sicherste Option)
1. Auf der Ollama-VM einen GitHub Runner installieren:
   ```bash
   # Repo → Settings → Actions → Runners → New self-hosted runner
   # Anweisungen folgen, dann:
   sudo ./svc.sh install
   sudo ./svc.sh start
   ```
2. Datei `.github/workflows/code-review-selfhosted.yml` → umbenennen zu `code-review.yml`
3. GitHub Secret setzen:
   - `OLLAMA_MODEL` → `qwen2.5-coder:32b`
4. Andere YAML-Dateien löschen

### Option C: Groq Cloud (Fallback, kein eigener Server nötig)
1. Account auf https://console.groq.com erstellen (kostenlos)
2. API Key generieren
3. Datei `.github/workflows/code-review-cloud.yml` → umbenennen zu `code-review.yml`
4. GitHub Secret setzen:
   - `GROQ_API_KEY` → Dein Groq API Key
5. Andere YAML-Dateien löschen

## Empfohlenes Modell

```bash
ollama pull qwen2.5-coder:32b
```

Qwen2.5-Coder 32B ist speziell für Code trainiert und findet mehr Bugs als allgemeine Modelle.

## Kosten

| Option | Tool-Kosten | API-Kosten | Gesamt |
|--------|-------------|------------|--------|
| A (Tailscale + Ollama) | $0 | $0 (lokal) | **$0** |
| B (Self-hosted + Ollama) | $0 | $0 (lokal) | **$0** |
| C (Groq Cloud) | $0 | $0 (Free Tier) | **$0** |

Alle drei Optionen sind komplett kostenlos.
