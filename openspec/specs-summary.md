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

## position-history
Purpose: TBD (created by archiving change update-overview-history-table).
- Closed position history appears in Overview only, not in the Position Workspace.
- History table adds account, setup, risk amount, leverage, margin, notional cost, and paid fees columns.
- Multi-select filters for account/setup default to All and reset on page reload; filters are not persisted.
- Pagination with per-page default 10 and Chakra UI Pagination controls.
- Persists only per-page preference under `overview.history.perPage`.
- Realized PnL is editable in history; commits on blur/Enter and allows partial negative drafts.

## position-overview
Purpose: TBD (created by archiving change update-overview-history-table).
- Active positions table includes existing columns plus account, setup, risk amount, leverage, margin, notional cost, and paid fees.

## position-sizing
Purpose: TBD (created by archiving change update-sizing-precision).
- Caps total size at 100% of account balance; no user-configurable cap.
- Step sizing uses cost ratios and derives size from price; step cost is `size * step price`.
- Uses Decimal.js precision 8 for intermediate sizing calculations.

## position-workspace-ui
Purpose: TBD (created by archiving change update-sizing-precision).
- Displays margin usage percentage as `marginEst / currentBalance * 100`.
- Labels resizing ratios as cost ratios with updated tips.
- Soft-deleted setups are hidden from selectors/management; positions referencing deleted setups remain visible with fallback labels.

## position-workspace
Purpose: TBD (created by archiving change remove-total-size-field).
- Risk-driven sizing only; no manual Total Size input.
- Dev-only Clear Data control appears before Export JSON in the header.

## positions
Purpose: TBD (created by archiving change update-close-pnl-fees).
- Requires realized PnL to close a position; close disabled until valid value provided.
- Realized PnL remains editable after close.
- Per-step fees computed by `step.cost * feeRate` based on maker/taker; fees included in break-even.
- Displays realized fees per step and total.
- Deleting an account deletes associated positions; deleting a setup soft-deletes it while preserving referencing positions.

## ui-input-abstractions
Purpose: TBD (created by archiving change refactor-shared-inputs).
- Shared NumberInput commits on blur/Enter via `onCommit`, sanitizes separators, allows partial negatives during edit.
- Shared MultiSelect renders from `createListCollection` and commits selections via `onCommit`.
- Both inputs pass through root style/system props.
