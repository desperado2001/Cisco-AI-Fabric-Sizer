# Cisco AI Fabric Sizer — calculation specification and boundary audit

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


**Source of truth:** `main/index.html` in [desperado2001/Cisco-AI-Fabric-Sizer](https://github.com/desperado2001/Cisco-AI-Fabric-Sizer).  
**Source snapshot:** Git blob `b06ae6229ce1e3a58aa1688e3a5611f3c2ff38fa`, inspected 2026-10-17.  
**Purpose:** Explain **what the app actually calculates**, reproduce its quantities, and distinguish implementation calculations from Cisco/OEM validated architectures. This is not a new Cisco reference architecture or a validated procurement BOM.

## 1. Conventions and reproducibility

- `ceil(x)`: round *up* to the next integer; `floor(x)`: round *down*.
- `dist(N,K)`: divide N endpoints among K switches, distributing remainders to the first switches. Let `q=floor(N/K)`, `r=N mod K`; switch `i` gets `q+1` if `i<r`, otherwise `q`. This matters: `sum(ceil(individual))` can be **greater** than `ceil(sum)`.
- A *logical link* is one 200/400/800G network connection as modeled by the chosen NIC mode. An *800G-equivalent cage* is an 800G switch faceplate port; two 400G lanes may consume one port **only if** breakout, optic, lane mapping, and physical cabling are supported. A *physical link* has **two optical ends**, unless the corresponding media is DAC/AOC/copper.
- Quantities such as leaf/spine switch count are integers; cable, optic, switch-port and power numbers must not be silently conflated.
- The application models **1:1 backend** bandwidth, whereas frontend is controlled by the `feOver` oversubscription setting.
- Code locations: `dist` line 992; VAST lines 993–1002; GB300 lines 1006–1230; `scaleUnitPlan` lines 1232–1240; `backendDesign` lines 1264–1420; frontend lines 1608–1624; `calc` starts line 1994. Line numbers refer to the snapshot and will change with edits.

## 2. Workload, GPUs, scale units and power

For ordinary 8-GPU server profiles:
- `G = requestedNodes × GPUsPerServer` (normally 8).
- `S = SU_nodes` where the CVD option defaults to **4** server nodes; custom S accepted.
- `SU_count = ceil(requestedNodes / S)`.
- `fabricCabledNodes = SU_count × S` when SU sizing enabled. If disabled, `fabricCabledNodes=requestedNodes`.
- **Shared fabric** calls `backendDesign(fabricCabledNodes, …)`; **independent SU fabric** calculates one unit then multiplies switch, optic and physical-link quantities by `SU_count` (see `calc` near lines 2140–2168). The two designs do **not** have identical economics.
- Compute *power-budget* mode: `rawFit=floor(1000 × budgetKW / unitPowerW)`; if SU mode is enabled `fit=floor(rawFit/S)×S`; limit to 4,096 compute units. **Exception:** if `fit<1`, code sets `requestedNodes=1` and flags power insufficient. Never interpret that output as power-feasible.
- `computeUnitPowerForSizing` (line 942) determines nominal or maximum power by platform; unknown profiles are not a valid basis for a firm power budget.
- Physical racks are constrained by **independent** RU, weight and cooling checks: `maxByRU=floor(rackRU/serverRU)`, `maxByWeight=floor(weightAllowance/serverWeight)`, `maxByPower=floor(1000×effectiveCoolingKW/serverMaxPowerW)`. These are planning ceilings, not automatically proof of rack feasibility or transient tolerance.
- Do **not** apply a fictitious GPU transient-power multiplier: OEM AC input excursion, inrush and power-cap behavior require separate confirmation.

## 3. Backend — general architecture and NIC mapping

`backendDesign(nodes,mode,topology,gpusPerNode,customProfile)` computes:

- `G = nodes × gpusPerNode`.
- Built-in B300 dual-plane (`dual400`): `planes=2`, `speed=400 Gbps`, `logicalLinksPerGPU=2`, hence **800 Gbps/GPU total**.
- Built-in single-800 profile: `planes=1`, `speed=800`, `logicalLinksPerGPU=1`.
- Custom/server based (notably **AMD MI355X**): `L = nodes × linksPerServer`; GPU-based: `L = G × logicalLinksPerGPU`.
- **Per-plane design load** `Lp = ceil(L / planes)`. This represents the busiest plane; with odd total links, the engine may provision symmetrical planes for the rounded-up load, which is intentionally conservative.
- `aggregateGbpsPerGPU = speed × logicalLinksPerGPU`.

### 3A. Cisco CX8 dual-plane B300 branch (up to 8,192 GPUs)

The Cisco CX8 dual-plane branch is selected when **8 GPUs/node**, **400G logical lane**, **2 logical links/GPU**, **2 planes**, and the custom profile is either absent or `cx8`.

For `G ≤ 8192`:
- `leavesPerPlane = max(4, ceil(G/64))`.
- `spinesPerPlane = max(2, ceil(leavesPerPlane/2))`.
- `host400PerPlane = G`.
- `host400PerLeaf = dist(G,leavesPerPlane)`.
- `host800CagesPerLeaf = ceil(host400PerLeaf/2)`.
- `uplink800CagesPerLeaf = 32` (64×400G equivalent).
- `logicalLeafSpine400PerPlane = leavesPerPlane×64`.
- `logical400PerLeafSpinePair = 64/spinesPerPlane` (**planning quotient**, not guaranteed integer/physical port allocation).
- `totalLeaves = leavesPerPlane×2`; `totalSpines=spinesPerPlane×2`.
- `physicalLeafSpine800 = leavesPerPlane×32×2`; `leafSpineOptics=2×physicalLeafSpine800`.
- `switchHostOptics=2×sum(ceil(host400PerLeaf/2))`, `hostOptics=G` (one dual-port CX8 host optic per GPU).

**Caveat:** At non-anchor sizes, `64/spinesPerPlane` can be fractional (e.g. 65 leaves → 33 spines). The code checks aggregate capacity but does **not** construct a realizable integer port-by-port full mesh. Treat the computed switch count as a planning capacity bound until a connection map is generated and validated.

### 3B. Cisco CX8 branch above 8,192 GPUs

At `G>8192`, branch switches to the **3-tier reference-derived model**:
- `leavesPerPlane=ceil(G/64)`.
- `spinesPerPlane=leavesPerPlane`.
- Each leaf continues with 32×800G uplinks.
- `logicalLeafSpine400PerPlane=leavesPerPlane×64`.
- `ssCoresPerPlane=8`.
- At `8193≤G≤16384`, `ssPerCore=16`, hence 128 super-spines/plane.
- At `G>16384`, `ssPerCore=32`, hence 256 super-spines/plane, **including beyond validated limits**.
- `logicalSpineSuper400PerPlane=spinesPerPlane×64`.
- `physicalSpineSuper800=(logicalSpineSuper400PerPlane×planes)/2`; `spineSuperOptics=2×physicalSpineSuper800`.
- `validatedScaleExceeded=G>32768`; not supported by reference extrapolation beyond this flag.

**Caveat:** The model uses reference-sized three-tier building blocks and aggregate equal-bandwidth links; exact local pod/spine/super-spine wiring needs an explicit connectivity design. The 8,192→8,193 crossover is **deliberately discontinuous**, not a numerical calculation error.

### 3C. Generic / AMD MI355X / custom backend

For rail topology:
- `linksPerServer = server-defined link count` or `gpusPerNode×logicalLinksPerGPU`.
- `railsPerPlane=max(1,ceil((linksPerServer/planes)×speed/800))`.
- `leavesPerPlane=max(railsPerPlane, railsPerPlane×ceil(nodes/32))`.
- Special non-custom 8×800G case uses `leaves=max(8,8×ceil(nodes/32))`.

For classic topology:
- `leavesPerPlane=max(1,ceil(Lp×speed/(32×800)))`.

Then loop until every leaf fits:
- `h[i]=dist(Lp,leaves)[i]`.
- `hostCages[i]=ceil(h[i]×speed/800)`.
- `uplinkCages[i]=ceil(h[i]×speed/800)`.
- Increment `leaves` until `hostCages[i]+uplinkCages[i]≤64` for all leaves.
- `physicalLeafSpine800PerPlane=sum(uplinkCages[i])`.
- `spinesPerPlane=max(2,ceil(physicalLeafSpine800PerPlane/64))`.
- `totalLeaves=leaves×planes`, `totalSpines=spines×planes`.
- `physicalLeafSpine800=physicalLeafSpine800PerPlane×planes`.
- `leafSpineOptics=2×physicalLeafSpine800`.
- `switchHostOptics=sum(hostCages[i])×planes`.
- `hostOptics=nodes×physicalPortsPerServer` for server-based profiles; else `G×physicalPortsPerGPU`.

**AMD MI355X preset from the current code:** 8 GPUs/server; default **8 NICs/server, 400G/NIC, 1 plane** (user-changeable NIC count, NIC speed and 1/2 planes); backend switch default **N9364E-SG2X-O (Silicon One)**. The physical NIC/optic mapping and selected server offering must be confirmed separately. This is **not** a certification of a specific AMD network reference design.

**Critical implementation assumption:** The per-leaf 800G-equivalent cage estimate relies on compatible 400G/800G port breakout; the code does not by itself prove that two unrelated host 400G NICs may physically share one switch optic. With single-port 400G optics, counts can be higher. Check TMG, polarity and actual optics/cabling.

## 4. GB300 NVL72 E-W and north/south

**GB300 compute** (1 unit = 1 complete 72-GPU NVL72 rack):
- `activeRacks = ceil(input)`, `G=72×activeRacks`.
- `networkSU=ceil(activeRacks/2)` and `fabricRacks=2×networkSU`.
- Two planes; **one 400G logical host link per GPU per plane**: `physicalHostLinks=G×2`.
- For `activeRacks≤64`, `leavesPerPlane=4×networkSU` (four leaves/plane/2-rack SU).
- Spine lookup from **fabricRacks** (both planes combined):
  - `≤2→4`, `≤4→6`, `≤8→12`, `≤16→18`, `≤32→36`, `≤64→72`.
  - Above 64 active racks an alternate computed 2-tier port planner is attempted, else a **derived** 3-tier planning model is used.
- Per ordinary leaf: `18×800G` leaf-spine links, yielding `physicalLeafSpine800=totalLeaves×18`; `leafSpineOptics=2×physicalLeafSpine800`.
- `hostOptics=G`; `switchHostOptics=G` on the reference path.
- `hostLeafCables=2×G`; `leafSpineCables=2×physicalLeafSpine800` for the modeled two-MPO-per-800G assembly.

**GB300 N-S converged frontend:** 36×400G host endpoints per NVL72 rack.
- `racks≤2`: **2 total collapsed switches**, no separate spine.
- `3–4`: 4 leaves + 2 spines.
- `5–16`: 8 leaves + 4 spines.
- `>16`: planning extrapolation `blocks=ceil(racks/16)`, `leaves=8×blocks`, `spines=4×blocks`.
- `hostSwitchOptics=ceil(36×racks/2)`.
- Non-collapsed `leaf400Uplinks=16×leaves`, `physical800Uplinks=ceil(leaf400Uplinks/2)`.
- These **published-anchor tiers** are deliberately step functions; do not treat an extrapolated >16 rack tier as an approved Cisco RA.

**GB300 management:** `mgmtNodes>0` → 2 management leaves, `host200Ports=2×mgmtNodes`, `switchBreakoutOptics=ceil(host200Ports/2)`, `uplink400Links=4`.

**GB300 storage leaf pair sizing:** `pairs=ceil(EBoxes/16)`, `switches=2×pairs`, `perSwitchUplinks=(activeRacks≤8 ? 8 : 16)`.

**GB300 OOB:** 2 rack ToRs per NVL72 rack; `rackTor100gLinks=4×racks`. More than two racks **forces** dedicated spine-leaf. `externalLowSpeedEndpoints=2×storageServers+2×mgmtServers+2×NDDNodes+networkSwitches`. `lowSpeedLeaves=max(2,ceil(endpoints/48))`, then round up to even. Spine option has 2 aggregation spines; `rackTorOptics=2×rackTor100gLinks`, `rackTorCables=rackTor100gLinks`. Code flags aggregate capacity exceeded when `rackTor100gLinks+2×lowSpeedLeaves > 2×36`. **Do not overlook this at 16/17-rack and similarly large transitions**; a warning is not an automatically expanded design.

## 5. Generic frontend, management and OOB

Generic frontend inputs `N` compute units, `M` management nodes, `k` links/unit, oversubscription `O`:
- `E=(N+M)×k` endpoints.
- Start with `F=2` frontend leaves.
- For each leaf, `e[i]=dist(E,F)[i]`, `hostCages[i]=ceil(e[i]/2)`, `uplinkCages[i]=ceil((e[i]×200/O)/400)`.
- Increment F until `hostCages[i]+uplinkCages[i]≤64` for every leaf.
- `physicalUplinkLinks=sum(uplinkCages)`.
- `spines=max(2,ceil(physicalUplinkLinks/64))`.
- `switchHostOptics=sum(hostCages)`.
- The formula implements a **200G/endpoint** frontend budget; ensure the chosen NIC and transceiver physically realize that rate.

Non-GB300 OOB:
- `endpoints=computeUnits+managementNodes+infrastructureSwitches+2×EBoxes+NDDNodes` (when enabled).
- `oobLeaves=max(2,ceil(endpoints/48))`.
- L2/STP aggregation if >2 leaves: `aggPairs=ceil(oobLeaves/47)`, `aggregators=2×aggPairs`, `leafCopperLinks=2×oobLeaves`, `peerLinks=aggPairs`.
- 40G OOB spine option if >2 leaves: **2 OOB spines**, `leafSpine40GLinks=2×oobLeaves`, `optics=2×links`. The code flags `oobLeaves>36` as a review condition.
- The generic OOB leaf computation counts endpoints on aggregate rather than modeling A/B pairwise port placements. Verify each redundancy domain independently.

## 6. VAST EBox, software and storage network

For EBox model `key`, `n=EBoxes`, per-EBox raw TB `R` from `EBOX[key]`:
- `rebuild=(n≤11 ? 2 : 4)`.
- `dataStrips=min(146,max(0,2n-rebuild-4))`.
- `ECfraction=(dataStrips>0 ? 4/(4+dataStrips) : 1)`.
- `usableFactor=(1-ECfraction)×0.92×0.99×0.9977`.
- `rawTB=n×R`; `usableTB=rawTB×usableFactor`; `usablePB=usableTB/1000`; `usablePiB=usableTB/1024` (**note:** source converts TB directly by 1024; does *not* convert decimal TB to binary bytes first; label as planning approximation).
- To reach target `T` PB, iterate EBoxes `n=12..256`, select first `usablePB≥T`; if no fit, code returns 256 **even when target remains unmet**. This needs a hard unsatisfied-capacity error.
- Generic VAST network `pairs=ceil(EBoxes/24)`, `distribution=dist(EBoxes,pairs)`, `uplinksPerSwitchGroup=ceil(groupEBoxes/3)`, `totalUplinkLinks=2×sum(groupUplinks)`, `switches=2×pairs`.
- Licenses: `capacityLicenses=ceil(usableTB)`; `coreLicenses=EBoxes×eboxCpuCores`; `installationServices=max(1,ceil(EBoxes/12))` if VAST enabled.

**Capacity step checks:** at `n=11→12`, rebuild rule changes from 2 to 4; at `n=24→25`, generic storage network jumps from one pair to two. Both are meaningful step discontinuities, not proof of arithmetic corruption.

## 7. Optics, cabling, switch hardware and spares

**Always calculate physical 800G links before transceiver endpoints:**
- Generic backend E-W `physical800LeafSpine = planes×sum(uplink800CagesPerLeaf)`.
- `leafSpineOptics = physical800LeafSpine × 2` (one switch optic at each end).
- `switchHostOptics = planes×sum(host800CagesPerLeaf)`.
- `hostOptics = numberOfPhysicalHostPorts` under selected NIC profile; GB300/CX8 800G breakout is a special case.
- Three-tier `spineSuperOptics=2×physical800SpineSuper`.
- GB300 dual-MPO counts **two MPO assemblies per 800G path**. Distinguish *fiber trunks*, *MPO assemblies*, *optic modules* and *logical Ethernet links* in all exports.
- Separate OOB, frontend, management, storage and backend media quantities; do not sum unlike cable types.
- **TMG allowlist** in `TMG_QUALIFIED` lines 1242–1251 is an in-app list of reviewed PID matches, **not** a real-time Cisco compatibility check.

**Spares:** for a BOM hardware/optics/cable category selected by scope:
`required=ceil(max(0,inputQty))`, `spares=ceil(required×sparePercent/100)`, `total=required+spares`. Software/licenses/services/subscriptions/ATO/bundles excluded. Scope may be all eligible, hardware-only or optics/cables. For `512×3%`, `ceil(15.36)=16`, total **528**.

## 8. Boundary audit — findings and classification

**Verified against the source formulas below.** A correct integer result **does not** constitute validated hardware connectivity. Confidence: **code-level static audit**; no end-to-end browser/CCW-XLSX/PPT test completed as part of this document.

| Boundary / case | Expected app output or behavior | Audit conclusion |
|---|---|---|
| CX8 `G=8192` | 128 leaves/plane, 64 spines/plane, 2-tier | Exact power-of-two capacity threshold; math consistent in aggregate |
| CX8 `G=8193` | 129 leaves/plane, **129** spines/plane, 128 superspines/plane, 3-tier | **Major step** from 2-tier; ensure 3-tier physical pod design and finances reviewed |
| CX8 `G=16384→16385` | 128 → 256 superspines/plane | **Major step**; source uses a fixed threshold, not fine-grained growth |
| CX8 `G=32768→32769` | `validatedScaleExceeded` becomes true; super-spine count stays at extrapolated tier | **Hard validation gate recommended**; must not present as validated reference design |
| CX8 non-power-of-two e.g. `G=4160` | 65 leaves/plane, 33 spines/plane; `64/33=1.93939…` logical 400G links/pair | **Confirmed modeling limitation:** fractional links/pair; no integer connection matrix |
| Generic AMD 8×400G, 1 plane, rail `N=32→33` | 4→8 leaves/plane; spine quantity from rounded uplinks | **SU/rail planning step**, not a numerical power-of-two bug |
| Generic rail `N=64→65` | 8→12 leaves/plane with same 8×400G/server assumptions | **Planning step**; validate incremental leaf use/cabling |
| SU `N=64→65`, `S=64` | 1→2 SUs; 64→128 fabric-cabled nodes | **Capacity bucket**, expected; cost steps must be visible |
| SU `N=563`, `S=64` | 9 SUs, 576 fabric-cabled nodes | Regression anchor already present in source |
| GB300 `racks=2→3` | E-W `fabricRacks=2→4`, OOB direct/STP forcibly becomes spine-leaf | Guardrail intended; ensure UI shows effective mode |
| GB300 `racks=8→9` | fabric SU rounds 10 racks, E-W published tier changes `12→18` total spines | Intentional step lookup |
| GB300 `racks=16→17` | N-S converged extrapolates from 12→24 switches; OOB fabric capacity warning likely | **Review facilities/OOB expansion**, not just backend |
| GB300 `racks=64→65` | Attempts generic compact 2-tier; otherwise derived 3-tier; `validatedScaleExceeded` true | **Not automatically Cisco-validated** |
| Storage `EBoxes=11→12` | Rebuild allowance changes from 2→4 | Confirm VAST effective-capacity curve at exact boundary |
| Storage `EBoxes=24→25` | Generic storage switch pairs 1→2 | Normal pair count step |
| VAST target above 256-EBox capacity | Returns 256 anyway | **Confirmed missing failure handling** |
| GB300 OOB `racks>2` but selected direct/STP | Effective mode forced to spine-leaf | Intended control; selector may differ from effective BOM |
| 400G breakout at odd link counts | `sum(ceil(host_i/2))` can exceed `ceil(totalHost/2)` | **Per-leaf allocation rounding**, preserve in optic/BOM math |
| Power budget cannot fit one SU | `requestedNodes=1` with insufficient-budget flag | **Do not treat output as feasible** |

### Design-risk findings requiring remediation or explicit sign-off

1. **Fractional leaf–spine pair links:** `64/spines` is not an integer for many CX8 intermediate scales. Aggregate spine capacity passes even though fully meshed link allocation is undefined. Build an integer wiring planner or flag the topology as capacity-only.
2. **Generic two-tier ‘boundary’ is only a flag:** `exceedsTwoTier` can be true without building actual 3-tier spines/superspines. Prevent approval as a complete network architecture.
3. **Optics ambiguity on AMD/custom 400G:** 800G-equivalent cage rounding is not the same as validating mixed 400G NIC host optics or 2×400G breakout on the selected switch and media.
4. **OOB spine pair exhaustion:** GB300 spine-count is fixed at 2; the warning reports aggregate port excess but does not automatically produce a valid larger topology.
5. **Target capacity not achievable:** `vastQtyForTarget` silently caps at 256. Must fail closed and report unmet target.
6. **Peak/transient power:** source capacity math is steady-state/max-nameplate planning; no verified OEM transient input curve.
7. **Unbalanced two-plane custom NIC counts:** per-plane demand is rounded with `ceil`, which conservatively provisions but may double count logical host paths and optics if the underlying physical ports are not assigned per plane. Validate per-plane allocations.
8. **Zero and non-integer input acceptance:** some functions use `Math.max` without integer normalization. UI typically restricts inputs, but direct code calls or malformed data could yield fractional server, NIC and port quantities. Normalize and reject invalid data at entry points.

## 9. Reference boundary test plan (must be rerun after every math change)

For any integer threshold **T**, test **T−1, T, T+1**; additionally test exact powers of two **2^k−1, 2^k, 2^k+1** and non-multiples of switch cage/breakout fanout.

- GPU count: 63/64/65; 127/128/129; 511/512/513; 4095/4096/4097; 8191/8192/8193; 16383/16384/16385; 32767/32768/32769.
- Server/SU count: 1/2/3/4/5; 31/32/33; 63/64/65; 127/128/129; 255/256/257; 563 with 64-node SUs. Test `suMode=off/cvd4/custom`, shared versus independent fabric.
- NVL72 racks: 1/2/3; 3/4/5; 7/8/9; 15/16/17; 31/32/33; 63/64/65.
- NIC modes: 7/8/9 links/server; 200/400/800G; one/two planes; rail/classic; odd link totals.
- VAST EBoxes: 11/12/13; 15/16/17; 23/24/25; 255/256/257; target just below/above 256-EBox effective maximum.
- OOB endpoints: 47/48/49; 95/96/97; aggregation 46/47/48 leaf boundaries; spine capability crossings.
- Spare rates: 0%, 0.1%, 3%, 100%; categories excluded from spares; per-PID (not whole-fabric) rounding.
- Power: budget one watt less/equal/greater than one server; one SU; max-node cap; zero/unknown power; PSU A/B loss.

**Required invariants for automated tests:**
```text
switches, optics, cables, hosts, spares are finite nonnegative integers
sum(perLeafHostLogicalLinks) == logicalLinksPerPlane
perLeafHostCages + perLeafUplinkCages <= physicalPortCages
perSpineTerminations <= spineCageRadix  [must validate integer allocations, not just aggregate]
sum(actualLinksEachPlane) == totalLogicalLinks  [or surplus explicitly disclosed]
leafEgressGbps >= assignedHostIngressGbps  [for 1:1 backend]
hostFacingOptics + cables follow exact supported media/connectors
all 800G optic endpoints = 2 * physical800GLinks
no use of three-tier designation without a complete third-tier wiring model
power feasibility implies total maximum load <= budget and rack constraints hold
all UI/PPT/CSV/XLSX values reconcile to the same BOM rows
```

## 10. Worked examples

**A. Cisco CX8 dual-plane, 64×8-GPU nodes (512 GPUs), SU off, shared fabric**
- `G=64×8=512`, `Lp=512 400G logical links/plane`.
- `leaves/plane=max(4,ceil(512/64))=8`.
- `spines/plane=max(2,ceil(8/2))=4`.
- **16 backend leaves + 8 backend spines** (24 switches).
- Host cage terminations: `512/8=64×400G/leaf` → `ceil(64/2)=32×800G` host cages/leaf.
- Leaf uplinks: `32×800G/leaf` → `8×32×2=512 physical leaf-spine 800G links`.
- Leaf-spine transceivers: **1,024** switch-side endpoints.
- Host-side optics: **512** CX8 dual-port optics. Switch-host optics: `8×32×2=512`.
- **WARNING:** This is an aggregate 1:1 design, not proof of transceiver or inter-switch lane pairing without physical mapping.

**B. AMD MI355X, 32 servers, 8×400G NICs/server, one-plane rail, SU off**
- `L=32×8=256×400G`; `Lp=256`.
- `railsPerPlane=ceil(8×400/800)=4`, `leaves=4×ceil(32/32)=4`.
- `h=256/4=64 logical 400G host links/leaf`; `hostCages=ceil(64×400/800)=32`.
- `uplinkCages=32`/leaf, total physical E-W links `4×32=128`.
- `spines=max(2,ceil(128/64))=2`.
- **4 backend leaves + 2 spines**; **256 leaf–spine transceivers**; **128 switch-side host 800G-equivalent optics**; **256 host 400G physical-port optics**.
- **Ordering qualification:** 128 switch host modules assumes supported 2×400G breakout; otherwise 256 400G switch host modules may be required. This is not interchangeable with 800G backend uplink optics.

**C. GB300 11 NVL72 racks (active=11)**
- `G=11×72=792`; `networkSU=ceil(11/2)=6`, `fabricRacks=12`.
- E-W leaves/plane `4×6=24`, total **48 leaves**.
- Spine lookup for 12 fabric racks: **18 total spines** (9/plane). Thus **66 E-W switches**.
- E-W leaf/spine links: `48×18=864 physical 800G links`, **1,728 optics**.
- Host side: `792` CX8 optics + `792` switch-facing optics, **1,584 logical 400G host paths**.
- N-S converged for 11 racks: **8 leaves + 4 spines**, independently of the E-W fabric.
- 2 rack OOB ToRs/rack = **22**; rack OOB 100G links `11×4=44`, with separate OOB aggregation and non-rack endpoints.
- 11 physical racks but **12-rack backend capacity**: never report 864 GPUs as deployed.

## 11. What a reviewer should request before defending a proposal

1. Save all GUI inputs and profile PIDs with a version/commit reference.
2. Recompute the formulas above on actual nodes/racks, active GPU count and fabric provisioned capacity separately.
3. Verify all **per-switch** host and uplink terminations plus exact ports and optical breakout compatibility, including integer leaf-to-spine maps.
4. Reconcile power (IT max, rack cooling, A/B feeds, inrush/transients), RU and rack weight.
5. Distinguish **Cisco-published RA anchors**, derived capacity-planning interpolation, and customer/OEM-specific assumptions.
6. Export an itemized source-to-BOM trace: each row should cite the intermediate calculation, the unit, and the assumptions.
7. Require sign-off when one of the flagged limits or modeling defects in §8 is reached.

**Status:** This is a detailed **source-derived computation specification and static corner-case audit**. The code still needs executable property tests, optics compatibility checks and CAD/port-level wiring validation before it can independently certify a build.
