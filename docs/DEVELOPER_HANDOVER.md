# Developer Handover — Cisco AI Fabric Sizer

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


## Whole-link mesh correction (2026-10-19)

This section supersedes earlier aggregate-only spine formulas and intermediate-scale examples below. Published reference counts remain reference anchors, not proof of every interpolated wiring plan.

Backend profiles (AMD MI355X, single-800G HGX, custom CX7/CX8/CX9, Rubin NVL8, and B300 dual-plane) now check a complete symmetric mesh of whole logical links. For F leaves, S spines, speed v and k links per leaf/spine pair:

- q = 800/v logical branches per 800G cage.
- k = ceil(maximum host links per leaf / S), at least one.
- Every leaf has S*k fabric branches. Require host cages + S*k/q <= 64.
- Every spine has F*k branches. Require F*k/q <= 64.
- Both fabric branch totals must pack into whole cages. Search S from two upward; when needed an odd leaf count can increase by one for symmetric packing.
- Counts of 800G-equivalent cage pairs describe optic occupancy. Breakout branches can terminate on different peer switches; they are not necessarily unsplit 800G point-to-point cables. OEM/TMG breakout and lane/cable qualification remains required.

For 600 active MI355X servers at 8x400G, one plane: 76 leaves, **64 spines**, one 400G branch per pair; 32 uplink cages/leaf and 38 downlink cages/spine. Host-side optics=4,800; switch-host optics=2,432; leaf/spine optic endpoints=4,864. With 3% per-row spares: 79 leaves and 66 spines. The old 38-spine result was only an aggregate capacity bound.

B300 dual-plane at 5,040 GPUs now uses 80 leaves and 64 spines per plane for this symmetric mapping, rather than 79/40. At 4,608 GPUs it uses 72/64 per plane, rather than 72/36. Exact published anchor counts remain unchanged.

The frontend similarly checks whole 400G links and the selected oversubscription per leaf, not only total spine capacity. At 600 compute + five management nodes, two 200G links/node and 2:1: 15 leaves, seven spines, three 400G links per pair, 315 uplinks and 630 uplink optic endpoints (before spares).

If a complete mapping cannot fit, quantities remain explicitly marked as capacity estimates requiring architecture review. Unverified generic 800G overflow and interpolated B300 three-tier layouts no longer export an unconditional nonblocking claim. Existing GB300 compact two-tier and bounded derived three-tier calculations retain their dedicated validation. Storage and OOB domain-specific capacity checks are separate; these checks do not certify an entire site or vendor architecture.


**Audience:** Incoming developer, SE, code-reviewer, or a new ChatGPT/Work conversation.
**Canonical code:** [`main/index.html`](../index.html). **Last reviewed:** 2026-10-18, Git blob `b06ae6229ce1e3a58aa1688e3a5611f3c2ff38fa`. Always re-fetch `main` before changes.

## 0. First five minutes

1. Open [README](../README.md), [the live source](../index.html), [Engineering Calculations](../ENGINEERING_CALCULATIONS.md), and [Calculation Methods and Boundary Audit](CALCULATION_METHODS_AND_BOUNDARY_AUDIT.md).
2. Run `node --test tests/*.test.js` at repo root; investigate any failing test before editing. Tests run with Node built-ins; no package installation is needed for the current test scripts.
3. Open `index.html` locally in a modern browser. Check platform selector, network KPIs/topology, validation notices, engineering CSV, CCW XLSX, and Build Presentation.
4. Record the latest commit SHA, requested change, affected profiles, relevant OEM/Cisco reference, and one or more expected before/after numerical examples.
5. Make the smallest coherent change; add regression tests and update formula references and this handover before committing.

**Rule:** The implementation in current `main/index.html` is the source of truth for *what the tool computes*; Cisco CVD/TMG/RA and OEM documents govern *what configurations are validated*. A calculation passing tests does not confer product compatibility or reference-architecture certification.

## 1. What exists and where

| Path | Role |
|---|---|
| `index.html` | Single-file application: HTML/CSS, controls, integrated JavaScript sizing engines, embedded presentation/export libraries, BOM/QA, rack planner, topology visualization. |
| `README.md` | User-facing description, decisions and regression command; update when a capability or recommended switch changes. |
| `ENGINEERING_CALCULATIONS.md` | Detailed formula and worked-example specification, intended for SE design defense. |
| `docs/CALCULATION_METHODS_AND_BOUNDARY_AUDIT.md` | Independent explanation of formulas, boundary findings and known modeling limitations. |
| `tests/backend.test.js` | Executes sizing functions extracted from the actual HTML; anchor, boundary, fabric, MI355X and GB300 tests. |
| `tests/customer.test.js` | Customer name / presentation and filename behavior regressions. |
| `docs/DEVELOPER_HANDOVER.md` | This file: architecture, safe workflow, change checklist and handoff prompt. |

There is **no separate application framework or server** in this baseline. Do not assume a `package.json`, compiled bundle, backend service, CI deployment or GitHub Pages URL exists unless you verify it.

## 2. How the app works

```text
Browser fields + platform presets
    | syncPlatform / syncCustomNic / syncSuUi / other UI syncs
    v
calc()
    | requested compute units or compute-power budget
    | scaleUnitPlan + computeUnitPowerForSizing
    |-- backendDesign OR gb300EastWestDesign
    |-- frontendDesign OR gb300ConvergedDesign
    |-- vastCapacity / vastQtyForTarget / vastNetwork / gb300StorageNetwork
    |-- gb300ManagementFabric / gb300OobDesign
    |-- per-link optic, cable, control, OOB and network BOM row assembly
    |-- spareApplies + calcSpare
    |-- PHYSICAL profile data + buildRackLayout
    v
BOM[] + window.DESIGN_STATE + validation messages + visual topology + KPIs
    |-- exportCsv()            Engineering detail (including planning rows)
    |-- exportCcwXlsx()        Purchasing-oriented CCW columns and exclusions
    '-- openPptBuilder()       User-selectable slide generation
```

Use the actual symbols above to navigate source, not guessed line numbers; the single-file line count will drift. `runBackendRegressionSuite()` is an embedded mathematical self-check. `dist(total, count)` balances endpoints across devices. `twoTierPortPlan()` is used for feasibility at physical cage/link-speed limits.

### Core entities and distinctions

- **Active** units/GPUs are not automatically equal to **SU-rounded, cabled, or fabric-provisioned** capacity.
- A **logical 400G link**, **physical 800G faceplate cage**, **host transceiver**, **switch transceiver**, and **fiber cable** are different counted objects.
- Independent network **planes** are not interchangeable with **rails**, even if a diagram is symmetric.
- Optics may be individually rounded **per leaf or per plane**. Do not replace a per-device sum of ceilings with a single global ceiling unless mathematically justified and topologically valid.
- **E–W backend**, **N–S frontend**, **storage**, and **OOB** are separate domains. Don't count shared spines or attach OOB to the in-band frontend inadvertently.
- Per-row hardware spares use `ceil(required * percent / 100)`; services/software/licensing and other excluded categories must not be silently uplifted.
- CCW XLSX is a procurement-oriented subset, not a numeric mirror of every engineering CSV or KPI row.

## 3. Current platforms and intentional defaults

| Family | Sizing characteristics / caution |
|---|---|
| Cisco UCS B300 / Supermicro HGX B300 | 8 GPU/server; single 800G or CX8 2×400G dual-plane depending on selection; Cisco RA anchors constrain specialized backend. |
| Cisco UCS H200 | Separate preset; verify actual NIC/server mapping rather than assuming B300 rates. |
| **AMD Instinct MI355X** | 8-GPU **server-oriented** profile; default **8 separate 400G RoCE NIC links/server**, **one plane**, **N9364E-SG2X-O Silicon One**. No Spectrum-X dependency. SE can change links/server, 200/400/800G and plane count; OEM NIC topology/host transceiver qualification remains required. An odd number of per-server links across two planes requires asymmetry review. |
| GB300 NVL72 | **72 GPUs/rack**, dedicated two-plane E–W sizing, 2-rack network SU and separately modeled converged N–S fabric; nontrivial compact two-tier and derived three-tier extension. Mark extrapolations as non-published, validation required. |
| Rubin NVL8 / Rubin NVL72 | Different server vs rack-scale structures; no unsupported assumption that a Rubin rack behaves as eight-GPU server. Check source/UI for available and incomplete profiles. |
| Custom | Explicit configuration is an engineering planning model; mandatory SE/OEM validation. |

**GB300 OOB invariant:** 1–2 NVL72 racks may have supported modeled direct/STP/spine-leaf choices. At **more than two active racks**, effective mode is *dedicated spine-leaf*, with physical OOB switches not merged into N–S spines. OOB spine PID is `N9336C-SE1`, not end-of-sale `N9K-C9332C`. Check actual TMG optics qualification before changing OOB transceiver PIDs.

**Power is not transient power:** Typical/max IT power, rack kW and A/B feed are distinct from OEM-defined AC inrush/power excursion. No invented universal transient percentage. AMD and future hardware power assumptions need explicit source and unknown-data handling.

## 4. Calculation reference reading order

1. `ENGINEERING_CALCULATIONS.md`: notation, SUs, general/CX8/GB300 leaf+spine sizing, optical ends/cabling, converged frontend, storage, management, OOB, spares, facilities, source identifiers and worked cases.
2. `docs/CALCULATION_METHODS_AND_BOUNDARY_AUDIT.md`: exact boundary behavior, implementation-vs-RA differences, risks, arithmetic examples.
3. `index.html`: reproduce each documented equation from actual source and verify if any docs became stale.
4. `tests/backend.test.js`: confirm automated expectations are genuinely independently meaningful; they cover selected logic and do **not** test the full browser export/rack workflow.

When disputing a number, provide: **input form values → normalized active/provisioned units → per-domain host links → physical cages/ports → per-switch distribution → leaves/spines → uplink links → optical ends and cable units → BOM category → export**. Always attach units to numbers.

## 5. Edge-case checklist — mandatory before merging formula changes

Test **N−1, N and N+1** at 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024 and at all platform SU and port limits. A value exactly equal to capacity must **not** create an unnecessary extra leaf, spine, cable bundle, or SU. Test both actual and SU-provisioned units.

- First node/rack; partially populated SU; exact multiple of SU; different shared vs independent fabric choice.
- Rail/classic and single-/dual-plane switches; odd 400G NIC counts on AMD; physical port breakout and host-optic counting.
- Per-leaf 32/64-cage or model-specific boundary, balanced distribution remainders, physical uplink bandwidth and spine downlink utilization.
- GB300 OOB **1,2,3** active racks, plus 8/9,16/17,32/33 and multi-SU quantities.
- 800G↔400G↔200G logical/physical transceiver conservation; leaf–spine optical ends should equal two per physical link where separate optics are used.
- 0% spares and fractional uplift, correct exclusions, no negative/NaN/out-of-range user inputs.
- Power-budget zero/insufficient budget, rack kW/RU/weight constraints and unavailable OEM power inputs.
- Cross-output conservation: topology, KPI, engineering BOM, CSV, CCW XLSX, facilities and PPT agree on **their respective included categories**.

Do not assume the existing test suite exhausts these permutations. If you discover a bug, record **minimal reproducer, expected vs actual, source function, fix and regression** in the commit/PR.

## 6. How to make a change safely

**New platform:** Add option/controls → `syncPlatform` defaults/field enablement → `calc` platform interpretation → `backendDesign` or rack-scale engine mapping → frontend/storage/OOB assumptions → host/network optics → `PHYSICAL` only with supported OEM data → BOM/QA → topology/PPT/export → tests → documents. Avoid copy/pasting NVIDIA NIC counts into AMD.

**New switch/optic PID:** Verify hardware capacity, license/feature role, supported port breakout and optics in current Cisco datasheet/TMG, including SKU ordering syntax (`=` where relevant), then update selection, port/optic mathematics, BOM labels, compatibility validation and tests. Available-to-order ≠ verified regional lead time.

**Altered formula:** Keep raw metrics for logical bandwidth, physical cages and quantities separate; refactor only if independently reconciled across major design anchors and exact capacity boundaries. Document whether revised math is Cisco published, derived interpolation, or unvalidated OEM plan.

**Power/facilities:** Source from *specific chassis/PSU/cooling SKU*. Separate maximum nameplate, expected operating power, A/B design, supported inlet voltage, power transient, rack cooling and rack weight. Unknown values remain unknown rather than invented.

**Release/commit:** Run `node --test tests/*.test.js`; open browser and exercise scenarios; generate CSV/XLSX/PPT and visually check at least one small, one boundary and one larger design; update both formula docs where relevant; commit with clear before/after and tests. Large changes should ideally be reviewed on a feature branch/PR; direct-to-main changes require equivalent validation.

## 7. Known limitations / review gates

- The reference material contains interpolation and unvalidated geometry for large fabrics; mathematical feasibility is **not** complete Cisco or NVIDIA/AMD CVD compliance.
- NIC-to-GPU mapping, server optics, rack U/power, third-party server and VAST controller assumptions must be vendor checked.
- Certain procurement BOM parents, configurable child SKUs, software and planning summary rows are intentionally excluded or differently represented in CCW exports.
- Tests currently exercise extracted JavaScript sizing functions; add browser-level validations before certifying UX, downloadable file integrity or slide rendering.
- Historical risks: custom active-vs-provisioned SU rounding; double-counting 400G paths as 800G optics; use of N–S fabric for OOB; crossing powers-of-two thresholds; extending 2-tier designs past physical fanout.
- Re-review the issues/boundary section of `docs/CALCULATION_METHODS_AND_BOUNDARY_AUDIT.md` before claiming an old corner case is solved.

## 8. Human-readable change ledger (fill every time)

| Field | Required entry |
|---|---|
| Starting commit | Full commit SHA on `main` |
| Motivation and affected profiles | E.g., AMD MI355X non-Spectrum-X backend |
| Technical source/validation | Cisco CVD/TMG, OEM spec, customer planning assumption |
| Formula input and expected output | Before/after worked numbers |
| Tests | Command, number passed/failed, manual exports checked |
| Open decisions | Validation-required design elements and owner |
| Final commit or PR | GitHub URL |

## 9. Paste this at the start of a new development chat

> Continue development of `desperado2001/Cisco-AI-Fabric-Sizer`. Fetch **latest GitHub main**, inspect `README.md`, `docs/DEVELOPER_HANDOVER.md`, `ENGINEERING_CALCULATIONS.md`, `docs/CALCULATION_METHODS_AND_BOUNDARY_AUDIT.md`, `index.html`, and `tests/*.test.js`. The **repo**, not any older chat or generated HTML file, is canonical. Before editing, report starting commit SHA, affected functions, current behavior and a test plan. Preserve platform-specific defaults, OOB network isolation, physical optic/port math and existing Cisco anchor tests. Run tests, update formulas and regression scenarios for any changes, validate exports, and report the commit SHA with a link. Clearly distinguish implemented formula, Cisco-published reference, and OEM/SE assumption. Do not assert an unvalidated custom calculation is Cisco-certified.

---
**Maintainer note:** This handover should evolve with the code; update it when the architecture, exports or regression strategy changes.
