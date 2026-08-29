---
name: valoria-workflow
description: >-
  Project-specific workflow for AI Presidential Battle (Republic of Valoria).
  Automates Git commit and push protocols after verified changes.
---

# Valoria Project Workflow & Git Sync Protocol

This skill is project-specific to the **Republic of Valoria (AI Presidential Battle)** codebase.

## Repository Configuration
- **Repository**: `https://github.com/Godwynthegolden/ai-presidential-battle-valoria.git`
- **Visibility**: Private
- **Default Branch**: `main`
- **Remote Configuration**: Configured locally with authentication credentials on remote `origin`.

## Post-Change Verification & Push Protocol

After any code modifications, bug fixes, or feature additions in this project:

1. **Verify Code Health & Tests**:
   - Run unit tests: `npx.cmd tsx src/tests/test-service.ts`
   - Run production build: `npm.cmd run build`

2. **Stage & Commit**:
   - Stage modified files: `git add .`
   - Commit with descriptive message: `git commit -m "<Clear description of change>"`

3. **Push to Remote**:
   - Push directly to main branch:
     ```bash
     git push origin main
     ```
