# UI CRUD Audit — Sprint 28 (Phase G)

> Sprint 28 G2. Page-by-page CRUD coverage of every route in `src/App.tsx`.
> Establishes the gap list that G3–G8 close; everything else either already
> ships or is legitimately read-only.
>
> Companion to roadmap entry [TagPulse · docs/roadmap.md → Phase G](../../TagPulse/docs/roadmap.md).
> Backend endpoint shapes verified against `openapi.json` regenerated from
> `9owlsboston/TagPulse@main` on 2026-05-10 (post-G1).

## Legend

- ✓ — shipped in UI today
- ✗ — backend endpoint exists, UI gap (must close in Sprint 28 unless deferred)
- n/a — legitimately not applicable (immutable history, deletion would be
  destructive of an audit trail, or the entity is server-managed)
- ⏳ — gated on another ticket (e.g., G6 gated on G1)

## Audit table

| Route / page                              | Entity                | List | Detail | Create | Edit | Delete | Sprint 28 ticket |
| ----------------------------------------- | --------------------- | :--: | :----: | :----: | :--: | :----: | :--------------- |
| `/`                                       | Dashboard             |  ✓   |  n/a   |  n/a   | n/a  |  n/a   | —                |
| `/devices`                                | Device                |  ✓   |   —    |   ✓    |  ✗   |   ✓¹   | **G5** (bulk)    |
| `/devices/register`                       | Device                |  —   |   —    |   ✓    | n/a  |  n/a   | —                |
| `/devices/:id`                            | Device                |  —   |   ✓    |   —    |  ✗   |   ✓¹   | **G4**           |
| `/telemetry`                              | TelemetryReading      |  ✓   |  n/a   |  n/a²  | n/a  |  n/a   | —                |
| `/telemetry/explore`                      | TagRead               |  ✓   |  n/a   |  n/a²  | n/a  |  n/a   | —                |
| `/telemetry-models`                       | TelemetryModel        |  ✓   |   —    |   ✓    |  ⏳  |   ✓    | **G6** (G1 ready)|
| `/rules`, `/rules/new`, `/rules/:id/edit` | Rule                  |  ✓   |   ✓    |   ✓    |  ✓   |   ✓    | —                |
| `/alerts`                                 | Alert                 |  ✓   |  n/a³  |  n/a   | n/a³ |  n/a³  | —                |
| `/integrations`                           | Integration           |  ✓   |   —    |   ✓    |  ✓   |   ✓    | —                |
| `/integrations/:id/deliveries`            | Delivery              |  ✓   |   —    |  n/a   | n/a  |  n/a   | — (see note 4)   |
| `/assets`                                 | Asset                 |  ✓   |   —    |   ✓    |  ✗   |   ✓¹   | **G8**           |
| `/assets/:id`                             | Asset / Binding       |  —   |   ✓    |   ✓⁵   |  ✗   |   ✓⁵   | **G8**           |
| `/sites`                                  | Site                  |  ✓   |   —    |   ✓    |  ✗   |   ✗    | **G3**           |
| `/sites` (zones nested)                   | Zone                  |  ✓   |   —    |   ✓    |  ✗   |   ✗    | **G3**           |
| `/map`                                    | MapConfig (read view) |  ✓   |  n/a   |  n/a   | n/a  |  n/a   | —                |
| `/inventory/products`                     | Product               |  ✓   |   ✓    |   ✓    |  ✓   |   ✓    | —                |
| `/inventory/products/:id`                 | Product               |  —   |   ✓    |   —    |  ✓   |   ✓    | —                |
| `/inventory/lots`                         | Lot (expiry queue)    |  ✓   |   —    |   ✓    |  ✓   |   ✓    | —                |
| `/inventory/lots/:id`                     | Lot                   |  —   |   ✓    |   —    |  ✓   |   ✓    | —                |
| `/inventory/stock-levels`                 | StockLevel            |  ✓   |  n/a   |  n/a²  | n/a² |  n/a²  | —                |
| `/inventory/stock-movements`              | StockMovement         |  ✓   |  n/a   |   ✓    | n/a⁶ |  n/a⁶  | —                |
| `/inventory/csv-import`                   | Import job            |  —   |  n/a   |   ✓    | n/a  |  n/a   | —                |
| `/admin/tenant`                           | TenantConfig          |  —   |   ✓    |  n/a   |  ✓   |  n/a   | —                |
| `/admin/tenant` → Map sub-tab             | MapConfig             |  —   |   ✓    |  n/a   |  ✗   |  n/a   | **G7**           |
| `/admin/tag-data-mappings`                | TagDataMapping        |  ✓   |   —    |   ✓    |  ✓   |   ✓    | —                |
| `/admin/usage`                            | UsageRecord           |  ✓   |  n/a   |  n/a   | n/a  |  n/a   | —                |
| `/admin/users`, `/admin/users/new`        | User                  |  ✓   |   ✓    |   ✓    |  ✓   |   ✓    | —                |
| `/admin/users/:id`                        | User                  |  —   |   ✓    |   —    |  ✓   |   ✓    | —                |
| `/admin/audit-logs`                       | AuditLog              |  ✓   |  n/a   |  n/a   | n/a  |  n/a   | —                |
| `/admin/dead-letters`                     | DeadLetterEvent       |  ✓   |   ✓    |  n/a   | n/a  |  n/a⁴  | —                |

### Notes

1. **Device / Asset "delete"** is exposed as `Decommission` / `Retire` —
   soft-delete that preserves history. Counts as ✓ for the operator workflow.
2. **Telemetry, tag-reads, stock-levels** are server-derived from ingest /
   movement events; no direct edit surface is appropriate. `n/a`.
3. **Alerts** are emitted by the rule engine; mutation happens by editing the
   originating Rule. The history view itself is intentionally append-only.
4. **Dead-letter retry** — UI exposes retry for `event_bus` source via
   `POST /admin/dead-letter/{id}/retry` (Sprint 27 C5). Integration-delivery
   retry is **not** wired in either repo; per roadmap G2 this gap is
   **deferred — gated on backend `POST /admin/dead-letter/{id}/retry` learning
   to dispatch by `source` column** (Sprint 28 C3 introduces the `source`
   column; full retry routing is Sprint 29 work).
5. **Asset bindings** — bind (create) and unbind (delete) already shipped in
   `AssetDetail.tsx` (`onBind`, `handleUnbind`). G8 adds the missing
   `PATCH /assets/{id}` for asset attributes; the binding row action the
   roadmap flagged is already present and is **not** a Sprint 28 deliverable.
6. **Stock movements** — backend models manual movements as immutable journal
   entries. Edit/delete would corrupt the audit chain; corrections are made by
   posting a compensating movement. `n/a` is correct.

## Gap → ticket mapping

| Gap                                                | Ticket | Status     |
| -------------------------------------------------- | ------ | ---------- |
| Sites & Zones — edit + delete                      | **G3** | planned    |
| Device detail — edit (`name`/`site_id`/`zone_id`)  | **G4** | planned    |
| Device list — bulk site/zone reassignment          | **G5** | planned    |
| Telemetry Models — edit metric                     | **G6** | planned (G1 shipped 2026-05-10, client regenerated) |
| Tenant Settings → Map config — inline editor       | **G7** | planned    |
| Asset detail — edit attributes (`PATCH /assets/{id}`) | **G8** | planned    |
| Integration delivery — retry from dead-letter      | —      | deferred → Sprint 29 (note 4) |

## Re-audit cadence

Re-run this audit at the start of any sprint that touches `src/App.tsx`
(adds, removes, or renames a route). Mechanical: `grep -n 'Route path=' src/App.tsx`
gives the row list; for each row confirm the matching backend endpoints in
`openapi.json` and update the table.
