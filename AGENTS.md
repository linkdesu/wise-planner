<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

Always call me Link when ever you are responding to my request.

# Project Context

This project is a single page application (SPA) built with React + TypeScript + Vite.
The production build must output a single, all-in-one HTML file that can be opened
locally in a browser via `file://`.

## Build Requirements
- Use the existing Vite setup and `vite-plugin-singlefile` for bundling.
- Ensure all assets are inlined into the final HTML.
- Avoid runtime assumptions that require a server (no absolute URLs, no API calls
  to localhost unless explicitly requested).

## Development Guidelines
- Keep changes minimal and focused.
- Prefer existing dependencies; avoid adding new ones unless necessary.
- The UI should work offline and without external network access by default.

## Output Expectations
- `npm run build` should produce a single HTML file in `dist/`.
- The output must open correctly via `file://` on modern browsers.

## Core Models
- Account model: `src/models/AccountModel.ts` stores user account info.
- Setup model: `src/models/SetupModel.ts` stores trading setup info.
- Position model: `src/models/PositionModel.ts` stores position info.

## Storage & Data Portability
- All models persist to IndexedDB in the browser.
- Support exporting data to JSON and importing from JSON.

## Key Features
- Manage accounts and setups.
- Risk-driven or stop-loss-driven position planning with automatic resizing step sizing.
- Simple PnL and win-rate overview per account and per setup.

## UI Direction
- Terminal-like design with a Monokai theme.
- Keep the UI focused on data; avoid fancy visual embellishments.
