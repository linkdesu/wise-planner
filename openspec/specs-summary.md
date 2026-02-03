# OpenSpec Specs Summary

## config-store
Purpose: TBD (created by archiving change refactor-history-pagination-config-store).
- Key-based config storage for JSON-serializable preferences.
- Stores Overview history per-page preference under `overview.history.perPage` only; no filter persistence.
- Migrates legacy `overview-history` to the new per-page key and ignores filters.

## entity-deletion
Purpose: TBD (created by archiving change add-delete-confirmation-rules).
- Requires explicit confirmation before deleting accounts or setups.
- Shows warning dialogs and only deletes on user confirmation.

## position-workspace-ui
Purpose: TBD - created by archiving change move-position-tables. Update Purpose after archive.
- Shows active and history position tables in the workspace via tabs.
- Provides PositionEditor dialog for active positions and New Plan creation.
- Requires confirmation before deleting an active position.
- Active positions table includes existing columns plus account, setup, risk amount, leverage, margin, notional cost, and paid fees.
- Displays realized fees per step and total.

## position-history
Purpose: TBD (created by archiving change update-overview-history-table).
- History table shows account, setup, risk amount, leverage, margin, notional cost, and paid fees columns.
- Multi-select filters for account/setup default to All and reset on page reload; filters are not persisted.
- Pagination with per-page default 10 and Chakra UI Pagination controls.
- Persists only per-page preference under `overview.history.perPage`.
- Realized PnL is editable in history.

## positions
Purpose: TBD (created by archiving change update-close-pnl-fees).
- Risk-driven sizing only; no manual Total Size input.
- Dev-only Clear Data control appears before Export JSON in the header.
- Requires realized PnL to close a position; close disabled until valid value provided.
- Realized PnL remains editable after close.
- Per-step fees computed by `step.cost * feeRate` based on maker/taker; fees included in break-even.
- Deleting an account deletes associated positions; deleting a setup soft-deletes it while preserving referencing positions.
- Caps total size at 100% of account balance; no user-configurable cap.
- Step sizing uses cost ratios and derives size from price; step cost is `size * step price`.
- Uses Decimal.js precision 8 for intermediate sizing calculations.

## ui-input-abstractions
Purpose: TBD (created by archiving change refactor-shared-inputs).
- Shared NumberInput commits on blur/Enter via `onCommit`, sanitizes separators, allows partial negatives during edit.
- Shared MultiSelect renders from `createListCollection` and commits selections via `onCommit`.
- Both inputs pass through root style/system props.

## account-changes
Purpose: TBD - created by archiving change add-account-changes. Update Purpose after archive.
- Stores manual account changes as records with id, accountId, amount, type, note, createdAt.
- Supports add/edit/delete of account change records per account.
- Blocks changes that would make account balance negative.
- Includes account change records in import/export flows.

## accounts
Purpose: TBD - created by archiving change add-account-changes. Update Purpose after archive.
- Computes current balance from initial balance + realized PnL + summed manual account changes.
- Provides AccountEditor dialog for editing account fields and managing account changes.
- Shows metrics columns: win rate, 1-day/7-day balance change, total manual wins/losses.
- Recomputes metrics from positions and account changes on each edit/recompute.
- Calculates 1-day and 7-day balance changes from closed positions only (by closedAt).
