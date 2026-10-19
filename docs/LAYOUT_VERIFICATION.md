# Physical network layout verification — 2026-10-19

## Optical OOB standard: 100G ? 2026-10-19

Optical OOB leaf-to-spine and routed core links now use 100G across GB300 rack-scale and generic MI355X/HGX/NVL8 profiles. The default generic aggregation policy is now spine100g; the explicitly selected 1G copper/STP override remains available. Legacy spine40g helper inputs migrate to the 100G policy.

BOM optical endpoints use QSFP-100G-DR-S= and duplex LC UPC single-mode fiber (CB-LC-LC-SMF planning cable family). Shared GB300 management uplinks no longer use 40G SR4/MMF. Link, switch, reserved-port and routed-block counts are unchanged. The 70-rack example still has 20 shared-management uplinks, 40 leaf/spine optic endpoints, ten core handoffs and 20 core optic endpoints, now all 100G. Copper endpoint ports remain 1/10G.

Cisco's FX3 datasheet confirms six 40/100G QSFP28 ports: https://www.cisco.com/c/en/us/products/collateral/switches/nexus-9000-series-switches/datasheet-c78-744052.html . Exact FX3 QSFP-100G-DR-S / software qualification remains explicitly unverified; existing SE1 qualification evidence is not generalized to the leaf. Customer-core compatibility and reach also remain qualification items. All 35 local tests pass, including executed OOB BOM rows and legacy policy migration.


## NVL8 and MI355X profile recheck ? 2026-10-19

The modeled full Rubin NVL8 rack contains nine eight-GPU servers. Backend rail sizing now normalizes each such rack to nine servers, and frontend/OOB endpoint counts use those enclosed servers. Previously backend rail grouping used rack units while frontend and OOB counted only one server per rack. GPU totals and rack-level facility inputs remain based on the selected rack configuration.

Odd dual-plane MI355X overrides now provision each symmetric plane for servers x ceil(NICs per server / planes), rather than ceil(all server links / planes). This conservatively covers the busier per-server plane; actual physical NIC and host-optic counts remain servers x NICs. The default eight-NIC single-plane profile is unchanged.

Profile tests cover AMD, Rubin NVL8 single/dual plane, CX8 physical single/dual port distinctions, rack/server equivalence, shared frontend storage capacity and OOB endpoints. Existing HGX single-800G layouts beyond the complete modeled two-tier limit remain explicitly flagged for architecture review. These checks do not add a deployable generic three-tier design or certify OEM NIC/optic compatibility. All 34 tests pass; rendered browser/export verification remains outstanding.


## Frontend and OOB correction ? 2026-10-19

This section supersedes the earlier fixed-uplink frontend and fixed-pair OOB findings below.

- GB300 converged frontend now solves a whole-link mesh at the selected 1:1, 2:1 or 3:1 target. It prefers whole 800G peer links and uses 400G breakout where needed. Host cages round per leaf. Storage and management receiving ports are reserved per spine before accepting a layout. These are derived engineering designs, not newly published Cisco RA anchors.
- Generic frontend also reserves shared storage receiving capacity. Dedicated storage uses its own receiving tier.
- GB300 OOB scales as routed aggregation blocks with two SE1 spines/block. Each rack consumes two downlink ports per spine; each low-speed leaf consumes one. One upstream port per spine is reserved, so downlinks may use at most 35 of 36 ports. Rack/leaf identities and port ranges are retained in the block map. Blocks require redundant routed customer OOB/core handoffs; they do not form an unmodeled L2 mesh.
- OOB sizing includes management of the newly added aggregation and low-speed switches. Generic 40G OOB scales to redundant blocks too, with up to 35 leaves/pair and a reserved upstream port per spine.
- BOMs now include GB300 low-speed leaf/spine 40G optic endpoints/cables, routed OOB upstream optic endpoints/cables, and management receiving optics/cables. Customer-core switch compatibility, routing and cable reach remain qualification items.

Worked 70-rack GB300 case (12 EBoxes, five management nodes, three ND nodes, 2:1 frontend target, shared spines):

| Item | Corrected active quantity |
|---|---:|
| E-W leaves / spines | 160 / 128, unchanged |
| Converged frontend leaves / spines | 40 / 16 |
| Frontend leaf/spine links | 640 x 800G |
| Frontend leaf/spine optic endpoints / MPO branch cables | 1,280 / 1,280 |
| Frontend switch-host optics | 1,280, rounded per leaf |
| OOB rack ToRs / shared low-speed leaves | 140 / 10 |
| OOB SE1 spines | 10 in five redundant blocks |
| OOB upstream links | 10, one per spine |

Each frontend leaf has 63 x 400G hosts (25.2 Tb/s) and 16 x 800G uplinks (12.8 Tb/s), giving 1.96875:1, within the selected 2:1 target. Each frontend spine uses 40 compute-facing cages plus up to two external-facing cages. The five OOB blocks consume 36, 36, 36, 36 and 11 ports per spine including the upstream port. Spare percentages apply after these active quantities.

Validation covers frontend targets across 1?130 racks, OOB pair and self-management conservation through 512 racks, and generic OOB block boundaries. All 31 tests pass. Site qualification remains visible as REVIEW; the previous frontend oversubscription and OOB port-capacity failures are removed for the worked case. Browser graphics and generated artifact rendering have not been visually verified.


Scope: computational checks of modeled links, device port budgets, bandwidth, optics, topology feasibility and shared receiving tiers. These checks do not constitute rendered browser QA, rack elevation review, OEM qualification or a complete port-by-port installation schedule.

## Findings

| Domain | Result | Evidence and limits |
|---|---|---|
| Generic backend: AMD, custom NICs, single-800G | Conditional pass | Whole-link mesh, host/uplink cage budgets, bandwidth and optic conservation pass when `portMapVerified` is true. Unsupported layouts remain capacity estimates requiring review. |
| B300/CX8 two-tier | Conditional pass | Published tested anchors remain unchanged. Intermediate counts now require integer pair links and cage packing. |
| B300/CX8 three-tier interpolation | Review | Existing quantities retained; a complete per-pod wiring plan is not yet verified. Do not interpret reference-aligned switch counts as a complete layout. |
| GB300 E-W | Conditional pass | Sweep of 1–130 racks validates modeled two-tier adjacency and bounded derived three-tier capacity. Beyond the derived boundary, capacity is explicitly exceeded. |
| Generic frontend | Conditional pass | Whole 400G pair links must meet selected oversubscription and fit both leaf and spine ports. |
| GB300 converged N-S | Fail/review at some scales | Fixed reference-block counts and fixed uplinks do not necessarily realize an integer full mesh or the selected frontend oversubscription. The 70-rack example fails the 2:1 target. |
| Storage leaf side | Pass within tested range | Host plus uplink occupancy fits 32 x 400G cages across 1–256 EBoxes. This does not prove the receiving-spine layout. |
| Shared receiving spines | Review or fail | Audit includes compute, storage and GB300 management uplink demand. Aggregate fit is not a per-spine port reservation or a breakout packing proof. |
| GB300 management | Conditional pass/review | Leaf cage arithmetic is checked. Far-end uplink optics and receiving port allocation need an explicit map. More than 60 management nodes exceed the current two-leaf cage allowance. |
| OOB | Conditional pass/fail | Existing aggregation capacity guardrails are included. GB300's fixed SE1 pair is insufficient for the 70-rack example. Low-speed media and exact endpoint attachment remain review items. |

## 70-rack GB300 worked example

Assumptions: 70 active GB300 NVL72 racks (5,040 GPUs), frontend enabled with a selected 2:1 target, 12 EBoxes, five management servers, three Nexus Dashboard nodes, shared receiving spines, OOB auto mode. No spares included below.

- E-W backend: **160 leaves + 128 spines, zero superspines**, across two planes. Modeled two-tier port mapping passes.
- N-S: **40 leaves + 20 spines**; 36 x 400G host endpoints/rack means 2,520 endpoints, or 63 per leaf. Each leaf has eight 800G-equivalent uplinks (16 logical 400G branches). Host bandwidth is 25.2 Tb/s per leaf and uplink bandwidth 6.4 Tb/s, producing **3.9375:1**, not the selected 2:1.
- A symmetric full mesh would require 16/20 = **0.8 logical 400G links per leaf/spine pair**. This is not a realizable whole-link mapping. A different topology may be feasible, but is not demonstrated by the current quantities.
- Storage leaf host/uplink cage occupancy passes. Shared receiving-spine demand is 640 compute + 32 storage + four management = **676 logical 400G ports** versus 2,560 aggregate available. Per-spine placement remains unverified.
- OOB: 280 rack uplinks plus 20 low-speed-leaf uplinks need **300 physical aggregation ports**, compared with **72** across two SE1 switches. The fixed pair is insufficient.

The full 70-rack solution therefore has **FAIL** layout status even though its E-W backend passes. Regenerating the old counts alone does not repair these N-S/OOB limits. A subsequent design change must provide a valid N-S topology and an expanded or partitioned OOB aggregation design.

## Application behavior

`auditFabricLayout()` records domain-level PASS, REVIEW and FAIL results, exposes them in the validation panel and `DESIGN_STATE.layoutAudit`, and carries an overall layout warning into affected purchasing BOM notes. Quantities are retained for review; the audit does not silently invent a different vendor architecture or change the reference blocks.

PASS denotes only the modeled check stated in that row. An overall REVIEW or FAIL must remain visible in exported procurement context.

## Verification

`node --test tests/backend.test.js tests/customer.test.js tests/layout.test.js`

28 tests pass. New checks include 792 generic backend combinations; all GB300 E-W rack counts from 1–130; storage leaf checks for 1–256 EBoxes in both generic and GB300 modes; OOB scale checks; management limits; explicit 70-rack failure assertions; application script syntax; and audit propagation hooks.

Known invalid scenarios are tested to ensure they are flagged, not counted as passing designs. Browser visual layout and generated XLSX/PPTX files were not rendered during this audit.

## Rechecked profile examples

Active quantities, before spares. Shared frontend, two 200G connections/server, 2:1 frontend target, 12 EBoxes, five management servers, three ND nodes, and optical spine-mode OOB. These are engineering model results.

| Profile | Servers / GPUs | Backend leaves / spines | Frontend leaves / spines | OOB leaves / spines |
|---|---:|---:|---:|---:|
| MI355X 8x400G, single plane | 600 / 4,800 | 76 / 64 | 15 / 7 | 17 / 2 |
| HGX B300 2x400G/GPU, dual plane | 600 / 4,800 | 152 / 128 total | 15 / 7 | 20 / 2 |
| Rubin NVL8 2x400G/GPU, dual plane | 600 / 4,800 | 152 / 128 total | 15 / 7 | 20 / 2 |
| 70 full Rubin NVL8 rack units | 630 / 5,040 | 160 / 128 total | 16 / 7 | 21 / 2 |
