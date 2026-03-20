#!/bin/bash
# Branch Protection Setup Script
# Applies GitHub branch protection rules to main branch requiring analytics smoke tests

REPO="Arch-777/PersonalAPI"
BRANCH="main"

echo "Setting up branch protection for $REPO/$BRANCH"
echo "================================================"

# Method 1: Using GitHub CLI (if API permissions allow)
echo ""
echo "Attempting to apply branch protection rules via GitHub CLI..."
echo ""

# Create branch protection rule JSON
cat > /tmp/branch-protection.json << 'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "analytics-smoke-fast",
      "analytics-smoke-full"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF

# Apply via gh CLI
gh api repos/$REPO/branches/$BRANCH/protection \
  --method PUT \
  --input /tmp/branch-protection.json

if [ $? -eq 0 ]; then
  echo "✓ Branch protection rules applied successfully!"
else
  echo "✗ GitHub CLI API call failed (common on some repository configurations)"
  echo ""
  echo "FALLBACK: Please apply the rules manually via GitHub Web UI:"
  echo ""
  echo "1. Go to: https://github.com/$REPO/settings/branches"
  echo ""
  echo "2. Under 'Branch protection rules', click 'Add rule'"
  echo ""
  echo "3. Configure the rule:"
  echo "   - Branch name pattern: main"
  echo "   - ✓ Require a pull request before merging"
  echo "   - ✓ Require status checks to pass before merging"
  echo "     - Search and add: 'analytics-smoke-fast'"
  echo "     - Search and add: 'analytics-smoke-full'"
  echo "   - ✓ Require branches to be up to date before merging"
  echo "   - ✓ Include administrators"
  echo "   - ✗ Allow force pushes: Do not allow"
  echo "   - ✗ Allow deletions: Do not allow"
  echo ""
  echo "4. Click 'Create'"
  exit 1
fi

echo ""
echo "Verifying rules..."
gh api repos/$REPO/branches/$BRANCH/protection | jq '.required_status_checks.contexts'

cleanup
exit 0
