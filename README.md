# Cisco AI Fabric Sizer

Standalone browser-based Cisco Secure AI Factory / AI Fabric BOM sizing tool.

## Canonical application
- `main/index.html`
- Current baseline: v80

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
  - Published GPU and 512-GPU SU designs are validation anchors, not hard sizing buckets. Shared-fabric leaf and spine counts interpolate from actual port demand.
  - The 5,040-GPU point remains two-tier at 79 leaves and 40 spines per plane.
  - Above 8,192 GPUs, leaves and spines continue to scale proportionally between the published 10,240/16,384/32,768-GPU three-tier anchors.

## Development workflow
Treat `main/index.html` as the source of truth. Commit meaningful changes with descriptive messages so future development can resume from GitHub without relying on chat history.

Run the JavaScript regression tests with `node --test tests/backend.test.js`.

The regression suite covers the embedded backend anchors, configurable MI355X
server-level NIC geometry, the Cisco N9364E-SG2X-O preset and Spectrum-X-free
guidance, unchanged GB300 NVL72 sizing, and the GB300 OOB rule that forces a
dedicated spine-leaf design above two racks.
