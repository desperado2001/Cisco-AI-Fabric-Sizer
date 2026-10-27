# Cisco AI Fabric Sizer

## Optical OOB standard: 100G ? 2026-10-19

Optical OOB leaf-to-spine and routed core links now use 100G across GB300 rack-scale and generic MI355X/HGX/NVL8 profiles. The default generic aggregation policy is now spine100g; the explicitly selected 1G copper/STP override remains available. Legacy spine40g helper inputs migrate to the 100G policy.

BOM optical endpoints use QSFP-100G-DR-S= and duplex LC UPC single-mode fiber (CB-LC-LC-SMF planning cable family). Shared GB300 management uplinks no longer use 40G SR4/MMF. Link, switch, reserved-port and routed-block counts are unchanged. The 70-rack example still has 20 shared-management uplinks, 40 leaf/spine optic endpoints, ten core handoffs and 20 core optic endpoints, now all 100G. Copper endpoint ports remain 1/10G.

Cisco's FX3 datasheet confirms six 40/100G QSFP28 ports: https://www.cisco.com/c/en/us/products/collateral/switches/nexus-9000-series-switches/datasheet-c78-744052.html . Exact FX3 QSFP-100G-DR-S / software qualification remains explicitly unverified; existing SE1 qualification evidence is not generalized to the leaf. Customer-core compatibility and reach also remain qualification items. All 35 local tests pass, including executed OOB BOM rows and legacy policy migration.


Standalone browser-based Cisco Secure AI Factory / AI Fabric BOM sizing tool.

## Canonical application
- `main/index.html`
- Current baseline: v81

## Current design decisions
- NVIDIA GB300 NVL72 OOB:
  - OOB spine is N9336C-SE1 (36×40/100G), replacing end-of-sale N9K-C9332C. Facilities use 320W typical / 450W maximum; installed weight remains unspecified.
  - Supplied Cisco TMG screenshots (2026-10-16) confirm QSFP-40G-SR4-S (40G, MPO-12 UPC MMF, up to 150 m) and QSFP-100G-DR-S (100G, duplex LC UPC SMF, 500 m) on N9336C-SE1 from NX-OS 10.6(1). BOM spare-ordering PIDs append `=`.
  - 1–2 racks may use direct handoff, simple STP aggregation, or spine-leaf OOB.
  - More than 2 NVL72 racks requires spine-leaf OOB.
- GB300 E-W first attempts a compact two-tier rail mapping above the legacy 64-rack reference range. The solver uses link speed, switch bandwidth, 64 physical cages, four rails, integer leaf-to-spine links, and uplink bandwidth at least equal to host bandwidth. It fits through 113 racks / 8,136 GPUs on two 400G planes. At 70 racks: 160 leaves + 128 spines total, zero superspines. Switch-side host optics round per leaf/plane. Validate the derived rack-to-leaf breakout cabling with the OEM.
- Only when the two-tier solver cannot fit does GB300 use the derived three-tier Clos: per plane, each two-rack pod has 4 leaves and 3 local spines, each with 24×800G down and 24×800G up. Three superspine groups each receive one spine from every pod. Group size is the smallest integer `s` with `pods × ceil(24/s) <= 64`. This three-tier derivation fits through 128 racks; larger deployments are flagged. BU/OEM validation remains required.
- The port solver is regression-checked against 8,192 links/plane at 400G on 51.2T switches, 32,768 at 200G on 51.2T, and 129,024 at 200G on 102.4T. These are distinct reference geometries, not a universal 8K GPU threshold. The latter two tests do not add new NIC-mode selectors or implement the complete Vera Rubin NVL72 OEM profile.
- AMD MI355X / 8-GPU server profile:
  - Reuse the existing server-based HGX/NVL8-style sizing framework rather than the NVL72 rack-scale model.
  - Default AI backend switch: **Cisco N9364E-SG2X-O (Silicon One)**.
  - Do not make Spectrum-X a dependency for AMD.
  - Selecting MI355X restores **single plane, 8 independent 400G RoCE NIC links per server**, equivalent to a 1:1 NIC-to-GPU planning mapping. Pollara 400 is a 400G adapter; a CX8-style 2×400G split per NIC is not assumed.
  - Dual-plane placement is an OEM override that splits separate NICs between fabrics, not a validated breakout mode or dual attachment for every GPU.
  - The UI exposes NICs per server, active link speed (200G/400G/800G), and single- or dual-plane placement. BOM, topology, switch counts, optics, and validation use those configured server-level values.
  - Dual-plane profiles should use an even NIC count for a balanced per-server split; odd counts are sized conservatively to the busier plane and called out for review.
  - The N9364E-SG2X-O is the recommended default, not a forced lock. An SE override is allowed but flagged for validation.
  - Beyond the modeled 128-leaf-per-plane 2-tier boundary, AMD results retain a large-scale fabric validation warning but route the review to Cisco, AMD, and the selected server/NIC vendor rather than NVIDIA.
- NVIDIA B300 / ConnectX-8 dual-plane reference architecture:
  - Supplied Cisco BU reference material supports two-tier scale through 8,192 GPUs (128 leaves and 64 spines per plane) without superspine.
  - Published GPU and 512-GPU SU designs are validation anchors, not hard sizing buckets. Shared-fabric leaf and spine counts must pass whole-link mesh and cage-budget checks; aggregate capacity alone is insufficient.
  - The 5,040-GPU point uses a complete symmetric 400G mesh at 80 leaves and 64 spines per plane.
  - Above 8,192 GPUs, leaves and spines continue to scale proportionally between the published 10,240/16,384/32,768-GPU three-tier anchors.

## Developer onboarding and calculation defense

If you are continuing development in a **new conversation**, begin with [Developer Handover](docs/DEVELOPER_HANDOVER.md). It provides the source-of-truth policy, code map, platform-specific invariants, developer workflow, boundary-case checklist and a copy-ready handoff prompt.

To reproduce and defend the sizing arithmetic, read [Engineering Calculations](ENGINEERING_CALCULATIONS.md) alongside the [Calculation Methods and Boundary Audit](docs/CALCULATION_METHODS_AND_BOUNDARY_AUDIT.md). These describe the implemented calculations and distinguish Cisco/OEM-validated reference anchors from engineering interpolation and assumptions.

Before every code change, run `node --test tests/*.test.js`. For formula changes, test N−1/N/N+1 at scale-unit, switch-capacity, power-of-two and GB300 OOB 2→3-rack boundaries. Also verify downloadable engineering CSV, CCW XLSX and presentation outputs in the browser.

## Development workflow
PowerPoint export refreshes the design from live inputs, including the customer name. Customer edits update the cached design immediately; clearing the field uses `Customer` in the deck and no customer filename prefix.

The selectable **Sample Rack Layouts** section exports one slide per rack type (packing role), with up to three actual racks: first, middle and last when more than three exist. Customer and Engineering presets include it. Editable grouped equipment blocks show quantities and RU, free space, power, weight and constraint warnings. Placement is illustrative, not an installation elevation; fixed rack-scale systems remain dedicated and unknown power/weight stays marked TBD.

Liquid-cooled Supermicro profiles expose **Include CDU** and the four supplied CDU PIDs. It starts unchecked. Enabled CDUs add quantities, electrical load and known dry weight to facility totals and exports; standalone units enter the BOM. In-rack units reserve 4U and electrical/weight headroom before modular-server packing. M1 rack bundles use their existing rack envelope and do not add a duplicate standalone CDU order line. M0 complete racks require separate space for an added in-rack CDU. Rack/manifold compatibility requires validation. No extra standby units or coolant/piping weight are assumed; external CDU floor space is additional to the IT rack count.

CDU cooling capacity is an independent packing limit alongside electrical power, RU, weight and reference density. Thermal load conservatively uses 100% of modeled compute peak, before adding the CDU's own electrical draw. Sidecars and in-rack CDUs use **one CDU per compute rack**: modular racks reduce server density to fit; fixed racks exceeding 200/250 kW show Cooling FAIL instead of silently assuming multiple local CDUs can be combined. Unused cooling in another local rack cannot compensate. In-row CDUs form a shared group, sized as `ceil(total compute heat / 1,800 kW)`; the group load and total capacity are shown separately from local limits. Unknown compute heat produces REVIEW. Cooling results appear in rack cards, overall rack warnings, validation and PowerPoint; selected PID capacities remain planning ratings pending temperature/flow and facility-loop validation.

Electrical defaults come from Supermicro datasheets: [in-row LCS-SCDU-1K3LR001](https://www.supermicro.com/datasheet/datasheet_In_Row_CDU.pdf) = 20 kW/unit, 1,560 kg dry; [sidecar LCS-SCDU-200AR001](https://www.supermicro.com/datasheet/datasheet_Sidecar_CDU.pdf) = 19 kW/unit, 1,145 kg dry; [OCP/MGX LCS-SCDU-250LP4002](https://www.supermicro.com/datasheet/datasheet_In_Rack_CDU.pdf) = 3 kW/unit, 114 kg dry. The supplied EIA PID is **LCS-SCDU-250L4002**, while that datasheet names **250L4001**: exact 4002 power and weight remain TBD, with an editable electrical planning input. Unknown CDU draw is explicitly excluded from the incomplete facility total. Cooling capacity (200/250/1,800 kW) is separate from electrical consumption; the server 25% peak factor is not applied to published CDU maximum draw.

Treat `main/index.html` as the source of truth. Commit meaningful changes with descriptive messages so future development can resume from GitHub without relying on chat history.

Run all JavaScript regression and calculator integration tests with `node --test tests/*.test.js`. For backend-only checks, use `node --test tests/backend.test.js`. The [26 October calculator retest](docs/CALCULATOR_RETEST_2026-10-26.md) records coverage, reproduced defects, fixes and verification limits.

The regression suite covers the embedded backend anchors, configurable MI355X
server-level NIC geometry, the Cisco N9364E-SG2X-O preset and Spectrum-X-free
guidance, unchanged GB300 NVL72 sizing, and the GB300 OOB rule that forces a
dedicated spine-leaf design above two racks.

## Whole-link connectivity validation

All generic backend NIC profiles and B300 dual-plane two-tier layouts now check integer links per leaf/spine pair, per-leaf bandwidth and both endpoint cage budgets. The frontend checks its selected oversubscription with whole 400G links. The 600-server AMD 8x400G example uses 76 active leaves and 64 active spines (79/66 including 3% spares). Breakout branches may connect different peers. Layouts without a verified mapping show architecture review and export `nonBlocking: false`; vendor qualification remains separate. See the dated correction in the calculation documents.

## Physical layout audit

See [Layout Verification](docs/LAYOUT_VERIFICATION.md) for domain checks and the 70-rack GB300 example. The backend passes its modeled port map, but the current converged frontend misses the selected 2:1 target and the fixed OOB spine pair exceeds its port capacity. Validation and affected purchasing notes now retain these findings; refreshing a BOM alone does not repair those designs.

## Frontend and OOB sizing correction

GB300 converged frontend now honors the selected oversubscription using a whole-link mesh and reserves storage/management receiving ports. OOB scales in redundant routed aggregation blocks with upstream ports reserved and own-switch management included. At 70 racks, 12 EBoxes and a 2:1 target: 40 frontend leaves + 16 spines, and 10 OOB SE1 spines in five blocks. OOB requires redundant customer-core handoffs. See the latest correction at the top of [Layout Verification](docs/LAYOUT_VERIFICATION.md); it supersedes the earlier audit failures.

## Project phases

Open **Project Phases**, size the first deployment using the normal controls, and choose **Capture current design**. Repeat for subsequent stages. Cumulative mode compares required BOM equipment against previously held quantities; independent mode treats each stage as a separate deployment. Captures include power (with server peak headroom), kg weights, backend port usage and layout status. Use **Replace with current design** to refresh a phase, and export JSON to keep the session's plan. Reuse is a quantity estimate pending architecture/cabling validation; captured phases do not automatically recalculate when inputs change. Existing CSV/XLSX/PPTX exports continue to represent the live design.

Compute platforms are grouped into **Modular servers** and **Full-rack systems**. Rubin NVL8 offers separate single-server (8 GPUs) and nine-server full-rack (72 GPUs) choices, each with its own PID list and quantity units. Project phase cards now offer **Export phase additions to CCW (XLSX)** using captured incremental equipment and configurator child quantities. Check phase software/service lines against existing entitlements before ordering.
