# Prompt: Branch Protection Rules einrichten

**Kopiere diesen Text und füge ihn bei GitHub Copilot Chat, Copilot Coding Agent, oder einem anderen AI-Agenten ein:**

---

Erstelle eine GitHub Actions Workflow-Datei unter `.github/workflows/setup-branch-protection.yml`, die beim manuellen Auslösen (workflow_dispatch) die Branch-Protection-Rules für dieses Repository einrichtet.

Nutze die GitHub REST API über `gh api` in einem Shell-Step. Der Workflow braucht `permissions: administration: write`.

## Ruleset 1: main Branch

Branch name pattern: `main`

Regeln:
- Require pull request before merging: JA
  - Required approving review count: 1
  - Dismiss stale pull request reviews when new commits are pushed: JA
- Require status checks to pass before merging: NEIN (vorerst nicht)
- Do not allow force pushes: JA
- Do not allow deletions: JA
- Require linear history: NEIN
- Include administrators: JA (enforce_admins: true)

API Endpoint:
```
PUT /repos/{owner}/{repo}/branches/main/protection
```

Body:
```json
{
  "required_status_checks": null,
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
```

## Ruleset 2: arena/* Branches (Wildcard)

Da die Branch-Protection-API keine Wildcards unterstützt, nutze stattdessen die neuere Repository Rulesets API:

API Endpoint:
```
POST /repos/{owner}/{repo}/rulesets
```

Body:
```json
{
  "name": "Protect Arena Branches",
  "target": "branch",
  "enforcement": "active",
  "conditions": {
    "ref_name": {
      "include": ["refs/heads/arena/*"],
      "exclude": []
    }
  },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" }
  ]
}
```

Das verhindert:
- Löschen der arena/* Branches
- Force-Push auf arena/* Branches

## Wichtig:
- Workflow nur mit workflow_dispatch (manuell auslösbar), NICHT automatisch bei jedem Push
- Klare Ausgabe im Log was eingerichtet wurde
- Fehlerbehandlung: Wenn Rules schon existieren, soll der Workflow nicht fehlschlagen sondern skippen
- Kommentare im Code auf Deutsch

---
