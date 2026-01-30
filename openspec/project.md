# Project Context

## Purpose
This project is a single page application (SPA) built with React + TypeScript + Vite.
The production build output support two different types:
- A single, all-in-one HTML file that can be opened locally in a browser via `file://`, for users really care about privacy.
- A normal SPA structure with multiple files that can be automatically deployed on Netlify, for users prefer a balance on both experience and privacy.

## Key Features
- Manage accounts and setups.
- Risk-driven or stop-loss-driven position planning with automatic resizing step sizing.
- Simple PnL and win-rate overview per account and per setup.

## Tech Stack
- Typescript
- React
- Vite
- Chakra-ui
- Decimal.js
- dayjs
- idb

## Project Conventions

### Code Style
Please follow the prettier rules, some custom rules are defined in `.prettierrc.cjs`.

### React Best Practice

- Calling setState synchronously within an effect can trigger cascading renders, so never calling setState within an effect.

### Architecture Patterns
The app consists of a single page, with content grouped using tabs. Different components are combined within each group to create the tab content; these components can be from Chakra-UI or custom-built.

All core calculation and data storage logic are separated from the UI components. The `models/` directory contains the core logic for each data model, and the `store/` directory contains the logic for persistence and retrieval of data from IndexedDB in browser.

#### Core Models
- Account model: `src/models/AccountModel.ts` stores user account info.
- Setup model: `src/models/SetupModel.ts` stores trading setup info.
- Position model: `src/models/PositionModel.ts` stores position info.

#### Storage & Data Portability
- All models persist to IndexedDB in the browser.
- Support exporting data to JSON and importing from JSON.

### Testing Strategy
All core logic in `models/` should be tested using unit tests.
UI tests are not required but it is recommended to add test for complex UI status changes.

### Git Workflow
Please always use Conventional Commits format for commit messages.

## Build Requirements
- Use the existing Vite setup and `vite-plugin-singlefile` for bundling.
- Ensure all assets are inlined into the final HTML.
- Avoid runtime assumptions that require a server (no absolute URLs, no API calls
  to localhost unless explicitly requested).

## Development Guidelines
- Keep changes minimal and focused.
- Prefer existing dependencies; avoid adding new ones unless necessary.
- The UI should work offline and without external network access by default.

## UI Direction
- Terminal-like design with a Monokai theme.
- Keep the UI focused on data; avoid fancy visual embellishments.
