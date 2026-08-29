---
description: Architectural, API, and LLM invariants for the AI Presidential Battle (Republic of Valoria) application.
globs: ["src/**/*", "app/**/*"]
---

# Republic of Valoria Development Invariants

## 1. Dynamic Entity State Synchronization
- Dynamic or user-created candidates stored in client state must be transported over API payloads (`candidate` and `allCandidates`).
- Server routes (`/api/llm/generate`) and services (`nineRouter.ts`) must dynamically merge incoming candidates into memory registries before executing prompt generation or candidate lookups.

## 2. Next.js API Routes & Safe Response Parsing
- Public API routes (`/api/models`, `/api/config`) must implement both `GET` and `POST` methods.
- Client-side fetch helpers must read responses via `res.text()` and parse defensively inside try/catch blocks with clear diagnostic fallbacks to prevent `Unexpected end of JSON input` errors.

## 3. LLM Prompts & Multi-Tier JSON Parsing
- When generating complex objects (like character profiles), enforce `max_tokens: 2000` to prevent mid-stream token truncation.
- Use concrete 1-shot JSON examples in user prompts; avoid pseudo-TypeScript syntax (like pipe union types `"populist" | "technocrat"`).
- All JSON extractors must implement multi-tier fallbacks: direct `JSON.parse` -> markdown fence stripping -> `{` to `}` isolation -> trailing comma/control char sanitization -> regex heuristic field extraction fallback.

## 4. UI Architecture & View Isolation
- Character creation, parameter customization, avatar cropping, and election lineup selection belong exclusively in `CharactersManagerView.tsx`.
- `CandidateRoster.tsx` and `DebateArena.tsx` must display only participating contenders and live debate statuses without inline configuration clutter.

## 5. Post-Change Automated Git Commit & Push
- After completing verified code modifications or feature additions in this project:
  1. Verify with tests (`npx.cmd tsx src/tests/test-service.ts`) and build (`npm.cmd run build`).
  2. Stage and commit changes: `git add .` && `git commit -m "<Description>"`.
  3. Push immediately to repository: `git push origin main`.
