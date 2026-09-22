#!/bin/bash
# ──────────────────────────────────────────────────────────
# Branch-Protection Rules für Agent Deck
# ──────────────────────────────────────────────────────────
#
# Einmal ausführen:
#   chmod +x scripts/setup-branch-protection.sh
#   ./scripts/setup-branch-protection.sh
#
# Benötigt: gh CLI installiert + eingeloggt (gh auth login)
# ──────────────────────────────────────────────────────────

REPO="TukTuck/mwco"

echo "🔒 Branch-Protection Rules für $REPO"
echo "========================================="

# ── 1. main Branch schützen ──────────────────────────────
echo ""
echo "📌 Schütze Branch: main"
echo "   - Kein Force-Push"
echo "   - Kein Löschen"
echo "   - Nur über PRs (min. 1 Approval)"
echo "   - Admins eingeschlossen"
echo ""

gh api "repos/$REPO/branches/main/protection" \
  --method PUT \
  --input - << 'EOF'
{
  "required_status_checks": null,
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF

if [ $? -eq 0 ]; then
  echo "   ✅ main Branch geschützt!"
else
  echo "   ❌ Fehler beim Schützen von main (hast du Admin-Rechte?)"
fi

# ── 2. arena/* Branches schützen (über Rulesets API) ─────
echo ""
echo "📌 Schütze Branches: arena/*"
echo "   - Kein Force-Push"
echo "   - Kein Löschen"
echo ""

gh api "repos/$REPO/rulesets" \
  --method POST \
  --input - << 'EOF'
{
  "name": "Protect Arena Branches",
  "target": "branch",
  "enforcement": "active",
  "bypass_actors": [],
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
EOF

if [ $? -eq 0 ]; then
  echo "   ✅ arena/* Branches geschützt!"
else
  echo "   ❌ Fehler (Ruleset existiert vielleicht schon?)"
fi

# ── Zusammenfassung ──────────────────────────────────────
echo ""
echo "========================================="
echo "✅ Fertig! Branch-Protection aktiv."
echo ""
echo "  main      → Nur über PR + 1 Approval, kein Force-Push"
echo "  arena/*   → Kein Force-Push, kein Löschen"
echo ""
echo "Zum Prüfen: github.com/TukTuck/mwco/settings/branches"
echo "========================================="
