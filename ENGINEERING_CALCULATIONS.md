# Cisco Secure AI Factory Sizer — Engineering Calculations and Design Defense

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


**Date:** 2026-10-17  
**Source:** [main/index.html](./index.html), Git blob SHA b06ae6229ce1e3a58aa1688e3a5611f3c2ff38fa  
**Purpose:** Independently reproduce and defend the app's backend, frontend, storage, OOB, transceiver, cabling, PSU and rack quantities.

> This documents the *implemented calculations*, not a blanket Cisco validated design. Always distinguish published reference anchors, sizing approximations and unvalidated engineering extensions. Check actual HCL/TMG, server NIC mapping and CCW before customer commitment.

## 1. Mathematical conventions and definitions

| Variable | Meaning |
|---|---|
| N_req | Requested compute nodes, or rack-scale units |
| S | Compute units per scale unit (SU) |
| N | Deployed compute units, after SU rounding |
| g | GPUs per compute unit: usually 8/server; 72/NVL72 rack |
| G | Active/deployed GPUs = N × g |
| P | Backend network planes (1 or 2 for server sizing) |
| v | Backend logical link speed (Gb/s) |
| k | Logical links per GPU |
| L | Total host logical link count |
| H | Host logical links in busier plane |
| F | Leaves per plane |
| Z | Spines per plane |
| B | VAST EBox count |
| R | GB300 NVL72 active racks |

ceil(x) rounds upwards. floor(x) rounds downwards. Each independent network plane duplicates its own switching. **A 400G logical link, an 800G cage, a transceiver endpoint and a fiber cable are NOT equivalent quantities.** An 800G physical optical link ordinarily has two optics; some DR8 connections use two MPO-12 cables.

**Balanced distribution D(T,n):** Let base=floor(T/n), rem=T mod n. The first rem devices each receive base+1 links; the others base. Example D(10,3)=[4,3,3]. This mirrors the code's dist() function.

## 2. Inputs, scale units and power-derived sizing

Source functions: scaleUnitPlan(), computeUnitPowerForSizing(), calc().

~~~text
When SU mode = off:
    N = N_req
    SU_count = 1
When SU mode = CVD4:
    S = 4
    SU_count = ceil(N_req/4)
    N = 4 × SU_count
When SU mode = custom:
    S = chosen integer size
    SU_count = ceil(N_req/S)
    N = S × SU_count
GPU_count = N × g
~~~

**Shared fabric** sizes one entire N-node backend. **Independent SU fabric** sizes an S-node backend and multiplies its leaf, spine, optics and cabling by SU_count. These choices often differ in switch totals. For GB300, the E-W two-rack **network SU** is separate from general compute SU logic.

**Compute power as input:** If budget is W_budget kW and platform power is W_unit watts:

~~~text
raw_fit = floor(W_budget × 1000 / W_unit)
fit_after_SU = floor(raw_fit/S) × S  (if SU mode enabled)
N_req = min(4096, fit_after_SU)      (subject to minimum-unit warnings)
~~~

The budget covers **compute only**, not frontend, backend, storage or control infrastructure. If one complete SU cannot fit, the UI warns but still keeps a displayable unit; **it is NOT in-budget**. AMD MI355X and Rubin NVL72 have unknown OEM server/rack power in the current model, so power-based sizing is not authoritative for them.

## 3. General 8-GPU server backend — backendDesign()

Applies to general server platforms, custom GPU/NIC profiles, AMD MI355X, and relevant B300 profiles **unless** the specialized CX8 dual-plane case matches.

### 3.1 Calculate host links

**Per-GPU NIC mode:**

~~~text
G = N × g
L = G × k
H = ceil(L/P)
server_side_optics = G × physical_host_ports_per_GPU
~~~

**Per-server NIC mode (AMD MI355X):**

~~~text
L = N × links_per_server
H = ceil(L/P)
server_side_optics = N × physical_host_ports_per_server
effective_logical_links_per_GPU = links_per_server/g
~~~

Current AMD MI355X defaults: **8 GPUs, 8×400G NIC links per server, one plane, rail-optimized, N9364E-SG2X-O**. Both NIC count/speed and plane count can be changed. It does not require Spectrum-X and the specific NIC/host optic PID remains **TBD** pending server qualification. Odd L/P is balanced to the busier plane for sizing; verify actual physical symmetry.

Standard B300 single-800G mode defaults to g=8, v=800, k=1, P=1.

### 3.2 Initial leaves per plane

Generic rail-optimized:

~~~text
links_per_server = L/N
rails_per_plane = max(1, ceil((links_per_server/P) × v/800))
initial_F = max(rails_per_plane, rails_per_plane × ceil(N/32))
~~~

Special standard non-custom B300 1×800G/GPU rail case:

~~~text
initial_F = max(8, 8 × ceil(N/32))
~~~

Classic/non-rail topology:

~~~text
initial_F = max(1,ceil((H × v)/(32 × 800)))
~~~

### 3.3 Physical switch-cage validity loop

For tentative F leaves, distribute the plane's H logical host links using D(H,F). Then compute each leaf:

~~~text
host_logical_links[i] = D(H,F)[i]
host_800G_cages[i] = ceil(host_logical_links[i] × v/800)
uplink_800G_cages[i] = ceil(host_logical_links[i] × v/800)
PASS if host_800G_cages[i] + uplink_800G_cages[i] <= 64
If any leaf FAILS: increment F and recompute distribution.
~~~

That is the application's nominal **1:1 bandwidth** rationale: equal 800G-equivalent host and uplink capacity on every leaf. It does **not** automatically certify oversubscription under actual packet patterns, exact breakout allocations, or qualified optical connectivity.

### 3.4 Generic spines and physical links

~~~text
U = sum(uplink_800G_cages[i])  # per plane
Z = max(2, ceil(U/64))
total_leaves = F × P
total_spines = Z × P
physical_host_links = L                  # logical host Ethernet connections
switch_side_host_optics = P × sum(host_800G_cages[i])
physical_leaf_spine_800G_links = P × U
leaf_spine_optical_endpoints = 2 × physical_leaf_spine_800G_links
logical_leaf_spine_equivalent_links = physical_leaf_spine_800G_links × (800/v)
~~~

**Engineering limitation:** Z is computed from aggregate 64-cage spine capacity, not from guaranteed pairwise whole-link distribution. Validate full leaf-to-spine mesh and the number of parallel links between every leaf/spine pair. A generic tier-review alert is not itself a deployable superspine architecture.

### Example A: 32 AMD MI355X 8-GPU servers

~~~text
N=32; GPUs=256; links/server=8×400G; one plane
L=32×8=256 400G links
rails=ceil(8×400/800)=4
F=4×ceil(32/32)=4
host links/leaf=256/4=64
host cages/leaf=ceil(64×400/800)=32
uplink cages/leaf=32
total 64 cages/leaf -> passes
U=4×32=128 physical 800G uplinks
Z=max(2,ceil(128/64))=2
BACKEND: 4 leaves + 2 spines
server NIC/optic positions=32×8=256 (exact PID TBD)
switch-host 800G optics=4×32=128
leaf-spine optical endpoints=2×128=256
~~~

Interpret the difference between **256 × 400G NIC-side endpoints and 128 × 800G switch-side cages** carefully. Do not count 256 Cisco 800G host switch transceivers or assume 400G AMD host optics are Cisco-qualified.

## 4. Specialized NVIDIA CX8 dual-plane 8-GPU path

Source: backendDesign(); condition 8 GPUs per node, 2×400G logical links/GPU, 2 planes and corresponding CX8/non-custom profile.

For G <= 8192 GPUs:

~~~text
P=2; v=400; k=2; L=2×G; H=G per plane
F=max(4,ceil(G/64)) per plane
Z=max(2,ceil(F/2)) per plane
total_leaves=2F; total_spines=2Z
host_links_per_leaf=D(G,F)
host_switch_cages_per_leaf=ceil(host_links_per_leaf/2)
uplink_cages_per_leaf=32 (fixed)
server_side_CX8_800G_optics=G
switch_side_host_800G_optics=2×sum(host_switch_cages_per_leaf)
physical_leaf_spine_links=total_leaves×32
leaf_spine_optics=2×physical_leaf_spine_links
logical_leaf_spine_400G_links=2×physical_leaf_spine_links
~~~

**Defense:** 64×400G host paths consume 32×800G cages; reserving 32 other 800G cages matches ingress bandwidth at 1:1. The reported link count **64/Z logical 400G links per leaf-spine pair** can be fractional for intermediate Z, meaning a real whole-port adjacency plan must be verified.

For G > 8192 GPUs, code switches to a three-tier RA-derived method:

~~~text
F=ceil(G/64) leaves/plane
Z=F spines/plane
uplink_cages_per_leaf=32
RA cores/plane=8
If G<=16384: 16 superspines/core (128/plane), 4×400G per spine–SS pair
Otherwise:   32 superspines/core (256/plane), 2×400G per pair
total_superspines=2×superspines_per_plane
logical_spine_super_links=2×Z×64 (400G)
physical_spine_super_links=logical_spine_super_links/2
spine_super_optics=2×physical_spine_super_links
~~~

Code flags **G>32768** as beyond its validated reference range. Intermediate 3-tier counts are modeled, not necessarily explicitly published.

**Example B: 64 CX8 8-GPU servers:** G=512. Leaves/plane=ceil(512/64)=8; spines/plane=4; totals **16 leaves, 8 spines**. Host-side optics=512; switch-side host optics=512; leaf-spine 800G links=16×32=512; leaf-spine optics=1024.

## 5. GB300 NVL72 rack-scale E-W — gb300EastWestDesign()

Unlike 8-GPU servers, **each unit is a 72-GPU rack** and the E-W fabric rounds to **2-rack / 144-GPU network SUs**.

~~~text
R=active NVL72 racks
SU=ceil(R/2)
fabric_racks=2×SU
active_GPUs=72×R
fabric_GPU_capacity=72×fabric_racks
planes=2; speed=400G; 2 logical host links/GPU (one/plane)
leaves_per_plane=4×SU
total_leaves=8×SU
active_host_links=2×active_GPUs
host_CX8_800G_optics=active_GPUs
switch_host_800G_optics=active_GPUs   (normal <=64-rack case)
~~~

### Spines — implemented lookup, total across two planes

| Fabric racks (rounded) | Total spines | Spines/plane |
|---:|---:|---:|
| <=2 | 4 | 2 |
| <=4 | 6 | 3 |
| <=8 | 12 | 6 |
| <=16 | 18 | 9 |
| <=32 | 36 | 18 |
| <=64 | 72 | 36 |

These are the **actual code thresholds** in gb300SpinesForFabricRacks(); they must not be replaced by a generic spine-port rule.

~~~text
leaf_uplinks=18 physical 800G cages per leaf
physical_leaf_spine_links=total_leaves×18
leaf_spine_optical_endpoints=2×physical_leaf_spine_links
logical_leaf_spine_400G_links=2×physical_leaf_spine_links
host_to_leaf_MPO12_cables=2×active_GPUs
leaf_to_spine_MPO12_cables=2×physical_leaf_spine_links
~~~

The dual MPO-12 cable count for GB300 DR8 is a separate cable assumption, **not** a synonym for transceiver count.

### Example C: 11 GB300 NVL72 racks

~~~text
Active racks=11; active GPUs=11×72=792
network SU=ceil(11/2)=6
fabric capacity=12 racks / 864 GPUs
leaves/plane=4×6=24; total leaves=48
spines=18 total (9 per plane; <=16-rack lookup)
active 400G host links=1584
CX8 800G host optics=792
800G switch host optics=792
physical 800G leaf-spine links=48×18=864
leaf-spine optical endpoints=1728
host MPO-12 cables=1584
leaf-spine MPO-12 cables=1728
total E-W switches=66
~~~

**Critical distinction:** fabric switching is provisioned to **12 racks**; *installed compute optics and host cables* follow **11 active racks**. The 12-rack point is an **interpolation** between design anchors, not a claimed Cisco published BOM.

### Above 64 active racks

Code invokes twoTierPortPlan() with 4 rail groups and whole 800G cages: derive leaves from 64 × 400G host channels/leaf; search spine count satisfying whole-cage pair links, 1:1 and 64-cage bounds. If no feasible two-tier layout is returned, it creates an **engineering-derived** three-tier arrangement:

~~~text
SU=ceil(R/2)
leaves_per_plane=4×SU
spines_per_plane=3×SU
local leaf-spine links=18×800G per leaf (6 toward each of 3 spines)
each spine 24×800G down and 24×800G up
superspines_per_plane=3×SS_per_core
SS_per_core initially ceil(SU×24/64)
increase until SU×ceil(24/SS_per_core)<=64
physical_spine_super_links=total_spines×24
spine_super_optics=2×physical_spine_super_links
~~~

Capacity is flagged if SU>64 or SS_per_core>24. This three-tier branch **requires BU/OEM validation** and is not proof of a formally published topology.

## 6. Compute frontend / North–South

### General servers — frontendDesign()

~~~text
E=(N+management_nodes)×frontend_links_per_node
start leaves F=2
for each leaf:
  host_links[i]=D(E,F)[i]             # modeled 200G host links
  host_cages[i]=ceil(host_links[i]/2) # packed into 400G cages
  uplink_400G_cages[i]=ceil((host_links[i]×200/oversubscription)/400)
increase F until host_cages[i]+uplink_400G_cages[i]<=64 for every leaf
frontend_spines=max(2,ceil(sum(uplink_400G_cages)/64))
frontend_switch_host_optics=sum(host_cages[i])
physical_leaf_spine_uplinks=sum(uplink_400G_cages[i])
~~~

Oversubscription=host-side bitrate/uplink bitrate, **not** workload utilization. Example 2:1 halves required uplink bandwidth before discrete port rounding; confirm actual traffic assumptions.

### GB300 converged frontend — gb300ConvergedDesign()

Every NVL72 rack contributes **18 trays × 2 × 400G = 36×400G host ports**.

| Active racks | Compute N–S leaves | Spines | Total |
|---:|---:|---:|---:|
| 1–2 | 2 collapsed switches | 0 separate | 2 |
| 3–4 | 4 | 2 | 6 |
| 5–16 | 8 | 4 | 12 |
| >16 | 8×ceil(R/16) | 4×ceil(R/16) | 12×ceil(R/16) |

The 1-rack collapsed case is a starter **inferred from the published 2-rack minimum**, not its own published RA. For non-collapsed:

~~~text
host400_ports=36×R
switch_side_host_cages=ceil(host400_ports/2) # 2×400G packed/800G
leaf_400G_uplink_equivalents=leaves×16
physical_leaf_spine_800G_links=ceil((leaves×16)/2)
leaf_spine_optics=2×physical_leaf_spine_800G_links
host_cables=host400_ports
leaf_spine_cables=2×physical_leaf_spine_800G_links
~~~

11-rack example: **396×400G host ports; 8 leaves + 4 spines; 198 host 800G cages; 64 physical 800G leaf-spine links; 128 optic endpoints.** E-W and N–S switch sets are separate.

## 7. VAST storage capacity, switching and licenses

Source: EBOX, vastCapacity(), vastQtyForTarget(), vastNetwork(), gb300StorageNetwork().

| EBox model | Raw TB per EBox (code) |
|---|---:|
| 122 | 122.88 |
| 244 | 245.76 |
| 430 | 430.08 |

~~~text
B=number of EBoxes
rebuild=(2 if B<=11 else 4)
data_strips=min(146,max(0,2×B-rebuild-4))
EC_fraction=(4/(4+data_strips) if data_strips>0 else 1)
usable_factor=(1-EC_fraction)×0.92×0.99×0.9977
raw_TB=B×EBox_raw_TB
usable_TB=raw_TB×usable_factor
raw_PB_decimal=raw_TB/1000
usable_PB_decimal=usable_TB/1000
usable_PiB_as_currently_implemented=usable_TB/1024
~~~

**Known accuracy issue:** dividing SI TB by 1024 is *not* a dimensionally correct TB→PiB conversion. For defensible reporting use the explicit **decimal PB** output until binary capacity display logic is corrected.

**Capacity target mode:** iterate B=12 to 256; choose the first B whose usable PB >= target. Returns 256 at upper limit even if insufficient (review target shortfall). Manual EBox mode enforces B>=12. The utilization multipliers are modeled assumptions, not workload-specific validated VAST usable capacity.

**Ordinary storage network:**

~~~text
storage_leaf_pairs=ceil(B/24)
storage_leaves=2×storage_leaf_pairs
EBoxes_per_pair=D(B,storage_leaf_pairs)
uplinks_per_leaf_for_pair_i=ceil(EBoxes_per_pair[i]/3)
total_storage_uplink_links=2×sum(uplinks_per_leaf_for_pair_i)
~~~

**GB300-specific storage network:**

~~~text
storage_leaf_pairs=ceil(B/16)
storage_leaves=2×storage_leaf_pairs
uplinks_per_leaf=(8 if active_racks<=8 else 16)
total_storage_uplink_links=storage_leaves×uplinks_per_leaf
~~~

Optional dedicated VAST spines=2 if explicitly selected, otherwise 0. A dedicated-spine recommendation appears when nodes>=128, B>24, or >1 storage pair, but isn't auto-enforced.

**Commercial and software quantities:**

~~~text
VAST_usable_capacity_licenses=ceil(usable_TB)
VAST_CPU_core_licenses=B×CPU_cores_per_EBox (default 64)
VAST_install_service_units=max(1,ceil(B/12))
VAST_license_term_months=max(36,user_term)
~~~

Validate license metric, cores, service SKU and duration against active ordering guidance.

## 8. Management, OOB and separate physical fabrics

### Ordinary non-GB300 OOB — calc()

~~~text
OOB_endpoints =
      N (compute, one modeled endpoint/server)
    + management_nodes
    + backend_leaves + backend_spines + backend_superspines
    + frontend_leaves + frontend_spines (if enabled)
    + storage_leaves + dedicated_storage_spines (if enabled)
    + 2×B (if enabled)
    + Nexus_Dashboard_nodes

OOB_leaves=(max(2,ceil(OOB_endpoints/48)) if OOB enabled else 0)
~~~

If OOB_leaves<=2, use flat redundant pair.

**1G copper STP aggregation if more than 2 leaves:**

~~~text
aggregator_pairs=ceil(OOB_leaves/47)
aggregators=2×aggregator_pairs   # N93108TC-FX3
leaf_1G_uplinks=2×OOB_leaves
STP_peer_links=aggregator_pairs
total_1G_links=leaf_1G_uplinks+STP_peer_links
optic_endpoints=0 (native 1GBASE-T copper)
~~~

**40G spine alternative if more than 2 leaves:**

~~~text
OOB_spines=2 N9336C-SE1
40G_leaf_to_spine_links=2×OOB_leaves
QSFP40_optics=2×40G_leaf_to_spine_links
capacity_review_if OOB_leaves>36
~~~

48 endpoints per leaf and aggregate redundancy are **planning proxies**; confirm copper ports, dual attachment per individual endpoint and STP path.

### GB300 management fabric — gb300ManagementFabric()

If management enabled, two management leaves (separate from OOB):

~~~text
management_leaves=2
200G_host_links=2×management_nodes
switch_breakout_optics=ceil(200G_host_links/2)
management_400G_uplinks=4 (2 per management leaf)
management_host_cables=200G_host_links
~~~

### GB300 OOB — gb300OobDesign()

~~~text
R=active GB300 NVL72 racks
in_rack_N93108_ToRs=2×R
rack_100G_uplink_links=4×R   # 2 per ToR

external_low_speed_endpoints=
    2×storage_EBoxes + 2×management_nodes + 2×ND_nodes
    + managed_network_switches

low_speed_leaves=max(2,ceil(external_low_speed_endpoints/48))
if low_speed_leaves is odd: low_speed_leaves += 1

If R>2: FORCE effective OOB topology to "spine"
If R<=2 and auto selected: effective topology="direct"
~~~

**Direct (1–2 racks):** 4R rack-side 100G optics and 4R rack uplink cables; handoff to customer OOB/core. Customer-side optics are not counted as Cisco-provided.

**STP (1–2 racks):** 2 N93108 aggregation switches, 4R rack links, 8R optical endpoints, 4R cables, 1 peer link; code checks its small-pair 100G port capacity.

**Spine-leaf (always when >2 racks):** 2 *dedicated* N9336C-SE1 OOB spines, 4R rack-side links, **8R 100G optical endpoints** (both ends), 4R cables. Shared low-speed leaves contribute **2 × low_speed_leaves** extra uplink links. Capacity is flagged when (4R + 2×low_speed_leaves) > 2×36. These OOB spines are **not** the converged frontend or backend spines.

11-rack base check: **22 in-rack ToRs, 44×100G rack uplinks, 88 associated optical endpoints, 2 OOB spines**, plus separately calculated shared low-speed OOB leaves.

## 9. Optics, breakouts, cables and spares

### Canonical transceiver equations

~~~text
transceiver endpoints of ordinary optical physical links = 2 × physical_links
switch-side host optics = sum(ceil(logical_host_links_per_leaf × speed/800))
# for a two-plane backend, apply per plane before summing.
host-side modules depend on actual physical NIC cages, NOT switch cages.
logical breakout branches may be 2×400G per one 800G switch cage.
~~~

| BOM component | Current computation | Design caution |
|---|---|---|
| General backend host modules | GPU/server physical NIC port count | Exact host optic TBD for AMD/custom |
| Backend leaf host modules | P × sum(hostCageDist) | Round on each leaf, not once globally |
| Backend leaf–spine optics | 2 × physical 800G leaf–spine links | Do not confuse 400G logical vs 800G physical |
| Three-tier spine–superspine optics | 2 × physical spine–SS links | Only supported sizing branches |
| GB300 host-to-leaf MPO-12 cables | 2 × active GPUs | Two fabric planes/branches |
| GB300 leaf–spine MPO-12 cables | 2 × physical 800G links | Dual MPO-12 per DR8 path |
| GB300 derived spine–SS MPO-12 cables | 2 × physical 800G links | Derived, not qualified without review |
| General frontend switch host optics | sum(ceil(200G host ports per leaf/2)) | Actual breakout/transceiver qualification |
| GB300 frontend packed switch host optics | ceil(36R/2) | 800G switch cage with 400G branches |
| 1G STP OOB optics | 0 | Copper links still require cabling |
| 40/100G OOB optics | 2 × physical optical links | Check both ends/media/OS version |

Backend switch optic defaults use OSFP-800G-DR8= (SMF/500m) or OSFP-800G-VR8= (MMF/50m). In certain NVIDIA CX8 designs the host module is OSFPR-800G-DR8=. **TMG qualification of the Cisco switch does not guarantee qualification of a particular AMD NIC/host transceiver**. Validate OS version, breakouts, FEC, lanes, connector, reach and optic PIDs on both ends. Some BOM rows use placeholder/TBD IDs by design.

**Spare rule — spareApplies(), calcSpare():**

~~~text
required=max(0,ceil(input_quantity))
spares=(ceil(required×spare_percent/100) if category eligible else 0)
total_BOM_quantity=required+spares
~~~

Default spare percentage **0**. Scope may include all eligible, hardware-only, or optics/cables-only. Categories with license, software, service, subscription, ATO or bundle wording are excluded. Apply to **each eligible BOM line**, not to one grand total. Example: 3 links' optics at 10% spare: ceil(3×0.1)=1 spare (not zero).

Parent/child CCW configurator hierarchy is not the same as flat engineering BOM. CCW XLSX suppresses some bundle/parent/planning rows; validate orderability in CCW.

## 10. Rack / power / RU / weight logic

Sources: PHYSICAL, computeUnitPowerForSizing(), buildRackLayout(), calc().

**Modeled IT electrical load:**

~~~text
per_item_IT_power_W = hardware_quantity × selected_model_power_W
overall_IT_power_W = sum(all physical item IT powers)
overall_IT_power_kW = overall_IT_power_W/1000
selected_switch_power=(typical if selected and defined, else maximum)
usable_rack_power_kW=rack_power_limit_kW × rack_utilization
~~~

Source constants currently include Cisco C880A B300 **14.3kW max**, Supermicro B300 air/LCC/ALC **15kW planning**, Supermicro GB300 NVL72 **140kW nominal/142kW max**, AMD MI355X **unknown (0)**, Rubin NVL72 **unknown**, and Rubin NVL8 partly provisional/user-input. **Unknown power is not zero actual consumption.**

Rack fit is accepted only when:

~~~text
used_RU+item_RU <= rack_RU_limit
used_power_W+item_power_W <= usable_rack_power_kW×1000
used_weight_lb+item_weight_lb <= rack_weight_limit_lb
~~~

buildRackLayout() expands quantities to individual units; sorts by power descending, then RU, then weight; places in eligible best-filled racks according to rack strategy (role-separated or balanced), or creates another rack. This is **greedy heuristic bin-packing**, not guaranteed minimum rack count. Fixed NVL72 rack-scale units cannot be treated like repackable 8-GPU servers.

**Not computed:** PSU nameplate-to-load conversion, power transient excursion, power-on inrush, UPS kVA/PF, A/B feeder failover load, circuit breaker coordination, facility PUE, electrical overhead of cooling plants, or cooling-plant water requirements. OEM facilities signoff is mandatory.

## 11. Validation examples / regression checklist

Assume **zero spares** and no independent-SU replication unless stated.

| Test scenario | Defensible expected math |
|---|---|
| 32 AMD MI355X, 8×400G/server, 1 plane, rail, SU off | 256 GPU; **4 E-W leaves + 2 spines**; 256 server-side 400G ports; 128 packed switch-side 800G host optics; 128 physical leaf–spine 800G links; 256 leaf–spine optic endpoints |
| 64 CX8 8-GPU servers, dual plane, 2×400G/GPU | 512 GPUs; **16 E-W leaves + 8 spines**; 512 CX8 host optics; 512 switch-host optics; 512 physical leaf-spine links; 1024 leaf-spine optical endpoints |
| 11 GB300 NVL72 racks E-W | 792 active GPUs, 12-rack fabric capacity; **48 leaves + 18 spines**; 864 physical E-W leaf–spine links; 1728 endpoints |
| 11 GB300 NVL72 N–S | 396×400G host channels; **8 converged leaves + 4 converged spines**; 198 packed switch host optics; 64 physical uplink links; 128 uplink endpoints |
| 11 GB300 NVL72 OOB | **22 rack ToRs + 2 dedicated OOB spines + shared low-speed leaves**; 44×100G rack links and 88 associated endpoints |
| 12 EBox 244 | Raw=12×245.76=2949.12 TB; rebuild=4; strips=16; EC fraction=4/20=.2; usable factor=.8×.92×.99×.9977 |
| Generic spare 10%, required 31 optic modules | 4 spare; 35 total |
| 33 nodes, 4-node enforced SU | ceil(33/4)=9 SUs; N=36 deployed |
| 1000kW compute-only at 15kW per B300 server, SU=4 | raw fit=66; fit to SUs=floor(66/4)×4=64 servers; 960kW compute only |

## 12. Known boundaries and mandatory qualification

1. **Generic backend spine count proves aggregate port capacity, not a full pairwise Clos wiring plan.** Manually verify adjacency and whole-link breakout.
2. **Custom SU rounding** affects deployed GPU and fabric counts; distinguish N_req and N, shared and independent fabrics, and active/fabric capacity.
3. **GB300 step tables and Cisco CX8 models** include RA anchors and intermediate *derived* counts. Do not claim each arbitrary size is formally published/validated.
4. **AMD MI355X** 8×400G and N9364E-SG2X-O are configurable engineering assumptions, not a confirmed specific Supermicro MI355X/NIC/optic SKU.
5. **Optics**: host and network switch qualification, TMG/OS version, cabling lanes and fiber reach require current validation.
6. **VAST** effective capacity factors reflect a modeled reserve chain; actual commercial entitlement and usable output may differ. The current PiB label/conversion should be corrected.
7. **Facilities**: unknown/provisional OEM weights and powers, and all short-duration transients, must be explicitly marked unknown rather than guessed.
8. **GB300 OOB** >2 active racks forces dedicated spine-leaf; small direct/STP configurations are not viable by this model beyond two racks.
9. **Some quantity rollups include planning rows and CCW parent-child SKUs**; do not equate a summary row to a fully validated purchase list.
10. **No universal production certification** exists for arbitrary user-entered custom profiles; validate every final customer BOM and CVD/RA match.

## 13. Source-code traceability

| Stage | Implementation identifiers |
|---|---|
| Normalize platform/SU | syncPlatform, computeUnitPowerForSizing, scaleUnitPlan |
| Network input interpretation | calc, backendDesign |
| General leaf/spine and CX8 3-tier | backendDesign, dist |
| GB300 backend | gb300SpinesForFabricRacks, twoTierPortPlan, gb300EastWestDesign |
| Frontend | frontendDesign, gb300ConvergedDesign |
| Storage capacity | EBOX, vastCapacity, vastQtyForTarget |
| Storage network | vastNetwork, gb300StorageNetwork |
| Management/OOB | gb300ManagementFabric, gb300OobDesign, calc |
| Optical/BOM line assembly | calc (BOM add calls) |
| Spare uplift | spareApplies, calcSpare |
| Power/rack allocation | PHYSICAL, computeUnitPowerForSizing, buildRackLayout, calc |

**Recreation order:** normalize inputs → compute power-based or node-based units → SU rounding → backend → frontend → storage capacity and network → management/OOB endpoint rollup → OOB topology guardrail → per-fabric host and uplink optics/cables → per-line spare rules → physical IT power/rack/weight → validation flags → CCW export mapping.

**Version discipline:** Review/update this guide alongside any changes to index.html affecting NIC profiles, size tiers, breakout/optic assumptions, OOB, storage factors, or rack figures. Record source blob SHA for defensible audit trails.


## NVL72 four-rail enforcement ? 2026-10-20

Both NVL72 profiles require rail-optimized topology with four GPU-position rails per plane. Each rack has 18 four-GPU compute trays, so each rail carries 18 GPUs per rack. Leaves are provisioned in complete groups of four and host-link distributions repeat across the four rail groups. Rail count is independent of plane count: GB300 retains its published two-plane model; Rubin uses the revised two-800G-port planning profile below. Four-rail arithmetic does not certify Rubin NICs, optics or interoperability.

The design state records rail count, GPUs per rail per rack, leaves per rail per plane, and mapping verification. UI checks and topology labels expose these assumptions; the PowerPoint backend panel uses four representative GPU-position groups instead of 72 rack GPUs.

Source: https://www.cisco.com/c/en/us/products/collateral/data-center-networking/n9000-gb300-nvl72-era.html

Validation: 36 Node tests pass, including both profiles at 1?130 rack boundary samples, rail conservation, leaf cage budgets and unchanged GB300 anchors. Rendered browser and PowerPoint visual verification have not been performed.

## Rubin NVL72 backend revision - 2026-10-22

NVIDIA's preliminary DGX Vera Rubin NVL72 specifications list 144 single-port 800G ConnectX-9 interfaces for 72 GPUs. The revised NVL72 baseline therefore uses two physical 800G ports per GPU: 1.6 Tbps/GPU, 144 host interfaces/optics and 115.2 Tbps per rack. This replaces the prior one-port, 800G/GPU estimate. The DGX baseline does not certify the exact Supermicro implementation.

Source: https://www.nvidia.com/en-eu/data-center/dgx-vera-rubin-nvl72/ (checked 2026-10-22; preliminary specifications subject to change).

Engineering assumption: distribute the two independent ports across two 800G planning planes, retaining four GPU-position rails per plane. Each rail has 18 host links/rack/plane. This is not a vendor-approved two-plane topology and does not adopt the workbook's eight-plane 200G design. Keep the existing 51.2T switch geometry (64 x 800G cages), not the workbook's 102.4T assumption. Host optic ordering PID remains TBD pending exact OEM qualification; do not reuse a ConnectX-8 validated host optic claim.

For R racks, host links = host optics = switch-host optics = 144R; per-plane host links = 72R. Initial leaves/plane = 4 x CEILING(72R / (4 x 32)), preserving four rails and reserving equal host/uplink bandwidth. Complete whole-link mesh checks determine spines. The current two-tier model fits 28 full racks (2,016 GPUs); 29 racks require architecture review. No deployable Rubin three-tier topology is inferred. Leaf-spine optics count both endpoints. Export state carries bandwidth, physical ports/GPU and the planning basis; UI/BOM labels identify OEM validation requirements. Rubin NVL8 is unchanged.

Regression countercheck: all 38 Node tests pass. An independent enumeration checks 5,258 Rubin configurations: NVL72 at every rack count 1-130; NVL8 single/dual-plane modes with rail/classic topology at every server count 1-1,152 and full-rack count 1-130 (nine servers/rack). Of these, 4,576 have a complete modeled mesh with at least 1:1 leaf uplink bandwidth; 682 correctly require architecture review. Checks reconcile whole peer links, receiving-spine cage limits, host plus uplink leaf cage limits, total fabric bandwidth, links and both optical endpoints. Rejected allocations are independently checked for mesh infeasibility on the modeled 64-cage switches. This is arithmetic validation, not workload, OEM interoperability or rendered UI validation. NVL8 checks cover its existing 400G active-link modes, not an assumed 800G active link per port.

## Backend port consumption - 2026-10-22

The Backend Ports tab reports per-switch physical 800G cage usage against the modeled 64-cage switch. Leaf rows group identical host-link counts, host cages and uplink cages. Free leaf cages = 64 - hostCageDist[i] - uplinkDist[i]. Logical host link speed is displayed separately: an unused 400G branch in an occupied 800G cage does not create a free physical port. Quantities are per plane and per independent fabric; the number of planes and replicated fabrics is shown explicitly.

For verified two-tier meshes, spine downlink cages = physicalLeafSpineLinks / totalSpines; backend uplink cages = 0. Derived verified GB300 three-tier spines use 24 cages toward pod leaves and 24 toward superspines. Unverified layouts expose no claimed spine free capacity. This view covers backend fabric connections only and does not imply sufficient bandwidth, redundancy or qualified breakout paths for expansion. Port consumption is included in backend design state. Superspine port availability is outside this view.

At 104 GB300 racks, each plane has 48 leaves using 32 host + 32 uplink cages (0 free), 72 leaves using 31 host + 32 uplink cages (1 free), and 64 spines using 60 downlink cages (4 free). Across two planes this is 144 free leaf cages and 512 free spine cages; spare breakout branches are excluded. All 40 Node tests pass, including port conservation across GB300 and Rubin scales, three-tier mappings and independent fabrics. Browser visual verification remains outstanding.

## Server peak power allowance - 2026-10-23

Server peak planning power is 125% of the base maximum (25% headroom), applied once to compute, management/controller, VAST EBox and Nexus Dashboard server power. Source ratings remain unchanged in PHYSICAL. Switches retain their selected maximum/typical basis. Unknown server ratings remain unknown; the multiplier does not supply missing OEM data. This is a user-selected planning allowance, not a measured transient-spike envelope or a change to nameplate ratings.

Rack packing, fixed-rack loads, compute power-budget sizing on the maximum basis, facility rows/totals and exported compute/facility power use the adjusted values. Base compute maximum and the 1.25 factor are recorded separately in design state. Rack utilization remains a separate limit and is not another application of the server multiplier. Explicit nominal compute-budget sizing remains nominal where published and is labeled without peak headroom; facility/rack server loads still use the adjusted maximum. Rubin NVL8 full-rack budget sizing now correctly uses nine adjusted servers per rack.

Examples: B300 14.3 kW becomes 17.875 kW; Supermicro B300 15 kW becomes 18.75 kW; GB300 142 kW/rack becomes 177.5 kW/rack; Rubin NVL8 24 kW/server becomes 30 kW/server or 270 kW per nine-server rack. A 1.2 kW management server becomes 1.5 kW and a 900 W EBox becomes 1125 W. CDU capacity remains a cooling rating, separate from electrical load.

Power regression tests verify source preservation, no double application, unknown ratings, power-budget rounding, Rubin rack/server equivalence, rack packing boundaries and facility row reconciliation with both switch power bases. Browser/export visual verification has not been performed for this change.

## Kilogram weight standard - 2026-10-23

All live weight calculations, input fields, rack limits, summaries, facility rows, CSV columns, PowerPoint text and design-state fields now use kilograms. Existing pound-based physical constants were converted using 1 lb = 0.45359237 kg; net/gross distinctions, null gross values and unknown zero weights are preserved. Historical pound references earlier in this guide describe prior versions.

Input IDs and exported properties now use Kg suffixes. Rounded editable defaults preserve the previous planning basis: 154 lb Rubin proxy becomes 69.85 kg/server; 40 lb management default becomes 18.14 kg/server; 3000 lb rack limit becomes 1360.78 kg. These are converted planning defaults, not newly vendor-certified weights. Facility metric tons are kg / 1000. Export consumers should use weightKg, totalWeightKg, rackWeightKg and maxRackWeightKg rather than the old Lb keys; CSV weight headers use _kg.

All 46 Node tests pass, including net/gross conversion anchors, unknown weights, kilogram rack-limit enforcement and actual CSV numeric/unit output. Browser and exported PowerPoint visual verification remain outstanding.

## Project phased rollout - 2026-10-23

The Project Phases tab captures the current live calculator design as a named, optionally dated snapshot after running calc(). Users size each stage with the normal inputs; no quantities are interpolated from a final deployment. Captured snapshots remain unchanged when live inputs change. Replace with current design explicitly refreshes a selected snapshot. Phase snapshots are session-only; JSON export retains captured designs and comparisons. There is no phase-file import or automatic recalculation of stored phases in this version.

Cumulative mode requires one customer and nondecreasing GPU totals. BOM equipment rows are pooled by exact PID, summing across roles and including captured spare quantities. For each phase: potential reuse = min(previously held, required); additional = max(0, required - held); unassigned = max(0, held - required). Held quantity persists as max(held, required), so surplus from an earlier stage remains available for a later stage. A PID match is quantity planning only, not qualified physical reuse. Licenses, software, services, subscriptions, ATOs and bundles are separate per-phase items, not credited as reusable equipment. SU planning metadata is excluded. Independent mode does not carry inventory between stages.

Phase cards show cumulative GPUs and additions, compute units, backend switches, active design racks, power in kW, weight in kg, captured layout status and captured leaf/spine physical-port consumption. Platform, tier, plane and superspine changes flag architecture review. Active design totals exclude unassigned held inventory. No price, project cost, migration labor or cabling-reuse certification is inferred. JSON export is separate from the existing live-design CSV/XLSX/PPTX outputs.

All 51 Node tests pass, including inventory conservation, decreased switch requirements while compute grows, retained surplus reuse, changed PIDs/tiers, independent deployments, customer separation, captured spare counts, UI-handler capture/replacement/removal, snapshot isolation, HTML escaping and JSON output. No browser was available for rendered visual verification.

## Phase CCW export and deployment grouping - 2026-10-26

Each captured phase now includes an Export phase additions to CCW (XLSX) action. The existing CCW worksheet format is reused. Equipment quantities use the phase comparison's incremental quantities, including captured spares without another uplift. Compute/management ATO children stay out of the flat upload; their incremental quantities are written in parent MLB notes. MLB configurator parents are included when new children are needed. VAST retains its parent hierarchy and full per-phase software/service requirements; entitlement and contract review is required before ordering those lines. Captured subscription term, customer/phase filename and configurator quantities are used independently of current live inputs. Independent-mode exports contain the phase's full requirements.

Compute selection separates modular servers from full-rack systems. Rubin NVL8 individual server retains platform key rubin-hgx and exposes only SYS222GS server PIDs (8 GPUs/unit). Rubin NVL8 full rack uses rubin-nvl8-rack and exposes only SRS-RUBIN-NVL8 rack PIDs (9 servers / 72 GPUs/unit). The deployment model, not an incidental PID string, determines GPU count and power aggregation. Valid selected PID variants survive platform synchronization. Full-rack quantity labels use racks; modular labels use servers. Full racks start with one-rack SU when switching from the four-node CVD default. NVL8 full-rack systems receive dedicated physical racks and nine-server networking/OOB counts. Their inputs remain per server (24 kW base / 30 kW peak per server, 270 kW peak per nine-server rack at defaults). A rack of NVL8 servers is not an NVL72 system.

All 55 Node tests pass, including disjoint PID menus, preserved selections, stale-PID resistance, rack/server GPU and power math, phase CCW incremental child quantities and generated XLSX ZIP/XML content using captured data only. Rendered browser and Excel verification remains outstanding.
