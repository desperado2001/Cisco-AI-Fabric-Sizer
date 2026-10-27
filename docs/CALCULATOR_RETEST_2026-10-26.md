# Calculator retest — 26 October 2026

Local command: `node --test tests/*.test.js`

Result: **74 tests passed, 0 failed, 0 skipped.** `git diff --check` passed.

## Coverage

| Area | Checks performed |
| --- | --- |
| Backend | Published model anchors, off-anchor scales, whole links per leaf/spine peer, cage limits, bandwidth, optical endpoints, four rails per NVL72 plane, two-tier overflow and independent scale units. Existing Rubin sweep: 5,258 configurations; 4,576 verified modeled meshes, 682 correctly require architecture review. |
| Full calculation | Actual application `calc()` executed against controls seeded from HTML. 72 combinations: nine compute profiles × four scales (1, 3, 70, 130 units) × shared/dedicated storage. GPU totals, backend switch ordering, EBox/license ordering, spares, rack inventory, subsystem power and facility power/weight reconciled. |
| Feature switches | 144 combinations: all 16 frontend/VAST/OOB/management on/off combinations across nine profiles. Disabled subsystem quantities and ordering checked. GB300 built-in rack management remains included by design. |
| Frontend | Whole-link mesh and endpoint cage limits; 1:1, 2:1 and 3:1 oversubscription; shared receiving ports; GB300 collapsed-pair cases and large-scale boundaries. Dedicated storage does not reserve ports on the shared frontend for storage traffic. |
| Storage/VAST | All three EBox models, 12–256 EBoxes (735 capacity cases), independent raw/usable TB, decimal PB and binary PiB math, EC formula, minimal target quantities, unmet targets, capacity/core licenses and leaf port budgets. Dedicated receiving capacity and optic endpoint families checked. |
| OOB | Endpoint feedback including OOB switches themselves, 100G optical and copper/STP aggregation, GB300 direct/STP guardrail and routed block maps. Added 16 complete-calculation cases around endpoint/scale boundaries. |
| Cooling | 60 complete calculations across five liquid-cooled profiles, four CDU PIDs and three scales (1, 9, 70). Independent electrical/RU/weight/thermal limits; exact-capacity and one-watt-over cases; fixed versus modular racks; M0/M1 handling; local versus shared capacity; dry weights; unknown heat and electrical draw. |
| Exports and phases | Existing tests exercise CSV units, captured-phase inventory/additions and XLSX generation, current customer inputs, editable rack slide generation and slide geometry. |

The four full-calculation matrices above comprise 292 scenarios, in addition to targeted target-capacity and dedicated-spine cases. The harness uses the real calculation functions and HTML defaults with a minimal DOM adapter; it does not verify browser rendering, user event behavior, or PowerPoint/Excel visual rendering.

## Defects reproduced and fixed

1. **Network subtotal omitted SE1 OOB spine power and weight.** Physical facility totals included `N9336C-SE1`, but the network subtotal matched only selected name prefixes. Physical switch rows now identify their network classification from the selected switch specification. Example: a 70-server B300 design previously had a 0.9 kW gap between subsystem sum and facility total; the sum now reconciles.
2. **VAST binary capacity conversion.** The code divided decimal TB by 1,024 to report PiB. It now converts bytes: `usable TB × 10^12 / 1024^5`. For twelve 122.88 TB EBoxes, the existing usable-capacity formula yields 1.0719522246 PB, or 0.9520848328 PiB. The previous PiB display was 1.0468283443. Decimal usable TB/PB and associated license counts are unchanged by this unit fix.
3. **Unachievable storage targets were silent.** The target search stops at 256 EBoxes. An unmet target now sets `storage.capacityTargetMet = false`, adds a Storage capacity FAIL to the layout audit, and displays the shortfall in the VAST results. Successful targets retain the smallest permitted satisfying quantity.
4. **GB300 dedicated storage inherited converged-spine assumptions.** The two dedicated GX2A spines now use 128 total 400G receiving ports, rather than 256 400G-equivalent converged-spine ports. Management uplinks are excluded from this dedicated storage budget. Storage optics use 400G DR4 at both endpoints, and storage demand is excluded from shared converged-frontend reservations. Per-peer dedicated receiving placement remains REVIEW; exceeding the aggregate physical budget is FAIL.

## Limits of this verification

These tests validate implemented arithmetic and integration, not vendor certification or workload performance. Unsupported/over-capacity topologies retain FAIL or REVIEW; a passing test can assert that a design correctly fails its capacity check. Existing VAST efficiency factors remain model assumptions. Exact EIA `LCS-SCDU-250L4002` electrical draw/weight remain TBD, and Rubin/AMD unknown physical data remain unresolved. CDU thermal checks conservatively use 100% of modeled compute peak; temperature, flow, facility-loop and rack/manifold suitability still require configuration validation. No browser, native PowerPoint/Excel, remote CI or hardware tests were performed in this retest.
