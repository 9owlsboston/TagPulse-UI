# UI CRUD Audit — Sprint 28 (Phase G)

> Sprint 28 G2. Page-by-page CRUD audit cross-referencing every route in
> [src/App.tsx](../src/App.tsx) against the backend endpoints in
> [openapi.json](../openapi.json) (regenerated 2026-05-10 from `9owlsboston/TagPulse@main`,
> post-G1).
>
> Purpose: confirm the Sprint 28 Phase G gap list, surface any **other** gaps
> the roadmap didn't anticipate, and record which gaps are deferred vs. in-scope.
>
> Method: for each page, opened the source and grepped for
> `useCreate*`/`useUpdate*`/`useDelete*` hooks, confirmed each is actually
> wired to JSX (not just imported), then matched against backend verbs in
> `openapi.json`.

## Legend

- ✓ — wired in UI today (hook is imported **and** called from a button/form)
- ✗ — backend endpoint exists, UI gap
- n/a — backend intentionally does not expose this op (or the entity is
  immutable history — audit logs, alerts, stock movements, telemetry readings)

The "Sprint 28?" column records whether the gap closes in Phase G or is
deferred (with the reason in the per-page notes).

## Per-page audit

### `/devices` — Device list ([src/pages/devices/DeviceList.tsx](../src/pages/devices/DeviceList.tsx))

| Op            | Backend | UI today                                       | Sprint 28? |
| ------------- | :-----: | ---------------------------------------------- | ---------- |
| List          |   ✓     | ✓ (filter by status + search)                  | —          |
| Create        |   ✓     | ✓ (`Register Device` → `/devices/register`)    | —          |
| Bulk reassign |   ✓¹    | ✗ (no checkbox column, no bulk action)         | **G5**     |

¹ No bulk endpoint; G5 fan-outs `PATCH /devices/{id}` client-side.

### `/devices/:id` — Device detail ([src/pages/devices/DeviceDetail.tsx](../src/pages/devices/DeviceDetail.tsx))

| Op             | Backend                       | UI today                                   | Sprint 28? |
| -------------- | :---------------------------: | ------------------------------------------ | ---------- |
| Read           | ✓                             | ✓                                          | —          |
| Edit           | ✓ (`PATCH /devices/{id}`)     | ✗ (only Rotate Token + Decommission visible) | **G4**   |
| Decommission   | ✓                             | ✓ (soft-delete, preserves history)         | —          |
| Rotate token   | ✓                             | ✓                                          | —          |
| Attach cert    | ✓                             | ✓                                          | —          |

### `/sites` — Sites & Zones ([src/pages/assets/SitesZones.tsx](../src/pages/assets/SitesZones.tsx))

| Op                | Backend | UI today                                                              | Sprint 28? |
| ----------------- | :-----: | --------------------------------------------------------------------- | ---------- |
| List sites/zones  | ✓       | ✓ (`useSites` + `useZones`)                                           | —          |
| Create site       | ✓       | ✓ (`New Site` modal)                                                  | —          |
| Create zone       | ✓       | ✓ (per-site `Add Zone` modal)                                         | —          |
| **Edit site**     | ✓       | ✗ (no edit button; `useUpdateSite` exists in `useAssets.ts` unused)   | **G3**     |
| **Edit zone**     | ✓       | ✗ (no edit button; `useUpdateZone` exists unused)                     | **G3**     |
| Delete site       | ✓       | ✓ (trash icon → `handleDeleteSite` confirm)                           | —          |
| Delete zone       | ✓       | ✓ (per-row trash icon → `handleDeleteZone` confirm)                   | —          |

> The roadmap trigger (Boston DC timezone unchangeable) is the **edit gap**;
> delete already shipped on both site and zone rows.

### `/telemetry`, `/telemetry/explore` — Telemetry views

Read-only by design. `tag_reads` and telemetry readings come from ingest;
mutation isn't a CRUD concept here. **n/a.**

### `/telemetry-models` — Telemetry models ([src/pages/telemetry-models/TelemetryModels.tsx](../src/pages/telemetry-models/TelemetryModels.tsx))

| Op       | Backend                                                                       | UI today | Sprint 28?       |
| -------- | :---------------------------------------------------------------------------: | :------: | ---------------- |
| List     | ✓                                                                             | ✓        | —                |
| Create   | ✓                                                                             | ✓        | —                |
| **Edit** | ✓ as of Sprint 28 G1 (`PATCH /telemetry-models/{id}` + `TelemetryModelUpdate`) | ✗      | **G6** (G1 ready)|
| Delete   | ✓                                                                             | ✓        | —                |

### `/rules`, `/rules/new`, `/rules/:id/edit` — Rules

Full CRUD wired ([RuleList.tsx](../src/pages/rules/RuleList.tsx) + [RuleEditor.tsx](../src/pages/rules/RuleEditor.tsx)): list, create, edit, delete + enable/disable toggle. **No gap.**

### `/alerts` — Alert history

Append-only emission stream from the rule engine. Mutation happens by editing the originating Rule. **n/a.**

### `/integrations`, `/integrations/:id/deliveries` — Integrations

| Page                            | Op                                       | UI today | Sprint 28?              |
| ------------------------------- | ---------------------------------------- | :------: | ----------------------- |
| `/integrations`                 | List/Create/Edit/Delete + enable toggle  | ✓ all    | —                       |
| `/integrations/:id/deliveries`  | Read delivery log                        | ✓        | —                       |
| `/integrations/:id/deliveries`  | **Retry failed delivery**                | ✗        | deferred → Sprint 29²   |

² Backend `POST /admin/dead-letter/{id}/retry` only handles `event_bus`-source
events today. Integration-delivery retry depends on Sprint 28 C3 adding the
`dead_letter_events.source` column and Sprint 29 routing retries by source.
Out of Phase G scope.

### `/assets`, `/assets/:id` — Assets ([AssetList.tsx](../src/pages/assets/AssetList.tsx), [AssetDetail.tsx](../src/pages/assets/AssetDetail.tsx))

| Op                     | Backend                       | UI today                                                           | Sprint 28? |
| ---------------------- | :---------------------------: | ------------------------------------------------------------------ | ---------- |
| List                   | ✓                             | ✓ (with current-location overlay)                                  | —          |
| Create                 | ✓                             | ✓ (`useCreateAsset` modal on list)                                 | —          |
| Read detail            | ✓                             | ✓                                                                  | —          |
| **Edit attributes**    | ✓ (`PATCH /assets/{id}`)      | ✗ (`useUpdateAsset` exists but unused on detail page)              | **G8**     |
| Retire (soft-delete)   | ✓                             | ✓ (`handleRetire` on detail)                                       | —          |
| List bindings          | ✓                             | ✓                                                                  | —          |
| Create binding         | ✓                             | ✓ (`onBind` form)                                                  | —          |
| Remove binding         | ✓                             | ✓ (`handleUnbind` confirm modal — already wired AssetDetail.tsx:113)³ | —       |

³ The roadmap G8 phrasing implied the unbind action was missing. It is
**already wired**. G8 therefore reduces to the asset-attribute-edit modal only.

### `/map` — Operational map ([src/pages/map/MapPage.tsx](../src/pages/map/MapPage.tsx))

Renders `useMapConfig()` at runtime. No mutation surface (map config is
edited via Tenant Settings — see G7). **n/a here**, gap lives on `/admin/tenant`.

### `/inventory/products`, `/inventory/products/:id` — Products

| Op       | Backend                       | UI today                                                                                | Sprint 28? |
| -------- | :---------------------------: | --------------------------------------------------------------------------------------- | ---------- |
| List     | ✓                             | ✓ ([ProductList.tsx](../src/pages/inventory/ProductList.tsx))                           | —          |
| Create   | ✓                             | ✓                                                                                       | —          |
| Edit     | ✓                             | ✓ ([ProductDetail.tsx](../src/pages/inventory/ProductDetail.tsx) `useUpdateProduct`)    | —          |
| Delete   | ✓ (`DELETE /products/{id}`)   | ✗ (no delete button on either page)                                                     | deferred⁴  |

### `/inventory/lots`, `/inventory/lots/:id` — Lots

| Op       | Backend                       | UI today                                                              | Sprint 28? |
| -------- | :---------------------------: | --------------------------------------------------------------------- | ---------- |
| List     | ✓                             | ✓ ([LotExpiryQueue.tsx](../src/pages/inventory/LotExpiryQueue.tsx))   | —          |
| Create   | ✓                             | ✓ (from product detail)                                               | —          |
| Read     | ✓                             | ✓ ([LotDetail.tsx](../src/pages/inventory/LotDetail.tsx))             | —          |
| Edit     | ✓ (`PATCH /lots/{id}`)        | ✗ (no `useUpdateLot` hook in `useInventory.ts`)                       | deferred⁴  |
| Delete   | ✓ (`DELETE /lots/{id}`)       | ✗ (no `useDeleteLot` hook)                                            | deferred⁴  |

### `/inventory/stock-levels`

Server-derived aggregate over stock movements. **n/a.**

### `/inventory/stock-movements`

| Entity        | Backend                                                  | UI today  | Sprint 28? |
| ------------- | :------------------------------------------------------: | :-------: | ---------- |
| StockMovement | `POST` only (immutable journal)                          | ✓ create  | n/a edit/delete |
| StockItem     | `PATCH /stock-items/{id}`, `DELETE /stock-items/{id}`    | ✗ (no detail page, no edit hook)         | deferred⁴ |

> Stock-movement edit/delete is **n/a** by design — corrections post a
> compensating movement. Stock-item edit/delete is a real backend capability
> with no UI; out of Phase G scope.

### `/inventory/csv-import` — Bulk import

One-shot job. No CRUD. **n/a.**

### `/admin/tenant` — Tenant Settings ([src/pages/admin/TenantSettings.tsx](../src/pages/admin/TenantSettings.tsx))

Today the tab list is: **General**, **Sensor metrics** (embeds TelemetryModels), **Tag-data fields** (embeds TagDataMappings, admin only).

| Op                    | Backend                        | UI today                                                                  | Sprint 28? |
| --------------------- | :----------------------------: | ------------------------------------------------------------------------- | ---------- |
| Read tenant config    | ✓                              | ✓ (General tab)                                                           | —          |
| Edit tenant config    | ✓                              | ✓ (General tab)                                                           | —          |
| Read map-config       | ✓ (`GET /tenant/map-config`)   | partial — only consumed by `/map`; **no Map tab on Tenant Settings**      | **G7**     |
| Edit map-config       | ✓ (`PATCH /tenant/map-config`) | ✗ (no editor anywhere)                                                    | **G7**     |

> Roadmap phrasing implied the Map tab existed and only displayed config. It
> doesn't exist at all yet. G7 must **add the tab** and the inline editor.

### `/admin/tag-data-mappings` — Tag-data mappings ([src/pages/inventory/TagDataMappings.tsx](../src/pages/inventory/TagDataMappings.tsx))

| Op       | Backend                                  | UI today                                | Sprint 28? |
| -------- | :--------------------------------------: | --------------------------------------- | ---------- |
| List     | ✓                                        | ✓                                       | —          |
| Create   | ✓                                        | ✓                                       | —          |
| Edit     | ✓ (`PATCH /tag-data-mappings/{id}` exists) | ✗ (no `useUpdateTagDataMapping` hook) | deferred⁴  |
| Delete   | ✓                                        | ✓                                       | —          |

### `/admin/usage` — Usage dashboard

Read-only analytics. **n/a.**

### `/admin/users`, `/admin/users/new`, `/admin/users/:id` — Users

Full CRUD wired (`useCreateUser`/`useUpdateUser`/`useDeleteUser`) plus API key generate/revoke on detail. **No gap.**

### `/admin/audit-logs` — Audit log

Append-only by definition. **n/a.**

### `/admin/dead-letters` — Dead-letter queue ([src/pages/admin/DeadLetters.tsx](../src/pages/admin/DeadLetters.tsx))

| Op                         | Backend                                  | UI today                              | Sprint 28? |
| -------------------------- | :--------------------------------------: | ------------------------------------- | ---------- |
| List                       | ✓                                        | ✓                                     | —          |
| Retry one                  | ✓ (`POST /admin/dead-letter/{id}/retry`) | ✓ (`retryOne` mutation)               | —          |
| Bulk retry                 | ✓                                        | ✓ (`handleBulkRetry`)                 | —          |
| Abandon                    | ✓                                        | ✓                                     | —          |
| Edit/Delete the row itself | n/a (immutable history)                  | n/a                                   | —          |

⁴ **Out-of-Phase-G deferrals.** The audit surfaces five backend-supported
mutations that are not exposed in the UI: Product delete, Lot edit, Lot
delete, StockItem edit, StockItem delete, TagDataMapping edit. None were
called out in the original Sprint 28 G scope, none have an active
operator-trigger like the Boston DC timezone story, and they cluster on
inventory pages that just shipped in Sprint 27. Recommendation: bundle them
into a focused "Sprint 29 inventory CRUD gap-fill" mini-phase and link this
audit from that ticket.

## Sprint 28 Phase G ticket map (consolidated)

| Ticket | Page                       | Gap closed                                                                            |
| ------ | -------------------------- | ------------------------------------------------------------------------------------- |
| G1     | (backend, TagPulse repo)   | `PATCH /telemetry-models/{id}` — **shipped 2026-05-10**, client regenerated           |
| G2     | this doc                   | UI CRUD audit (you are here)                                                          |
| G3     | `/sites`                   | Edit Site + Edit Zone modals                                                          |
| G4     | `/devices/:id`             | Edit modal (`name`/`description`/`site_id`/`zone_id`/`metadata`)                      |
| G5     | `/devices`                 | Multi-select + bulk site/zone reassign (client fan-out, ≤50/page)                     |
| G6     | `/telemetry-models`        | Edit metric modal (consumes G1)                                                       |
| G7     | `/admin/tenant`            | **Add Map tab** + inline editor (`tile_provider`/`api_key`/`style_url`/`attribution`) |
| G8     | `/assets/:id`              | Edit asset attributes (`name`/`kind`/`attributes`); unbind already wired              |

## Re-audit cadence

Re-run this audit at the start of any sprint that touches `src/App.tsx`
(adds/removes/renames a route) or `openapi.json` (changes an endpoint's verbs):

1. `grep -n 'Route path=' src/App.tsx` — enumerate routes.
2. `python3 -c "import json; spec=json.load(open('openapi.json')); …"` — list
   verbs per path (see commit `9a77459` for the one-liner used here).
3. For each page, grep its source for `use(Create|Update|Delete)*` hooks and
   confirm each is actually called from JSX (not just imported).
4. Update the per-page tables; flag new gaps as in-scope or deferred with a reason.
