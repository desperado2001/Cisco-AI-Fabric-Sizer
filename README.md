# Cisco AI Fabric Sizer

Standalone browser-based Cisco Secure AI Factory / AI Fabric BOM sizing tool.

## Canonical application
- `main/index.html`
- Current baseline: v75

## Current design decisions
- NVIDIA GB300 NVL72 OOB:
  - 1–2 racks may use direct handoff, simple STP aggregation, or spine-leaf OOB.
  - More than 2 NVL72 racks requires spine-leaf OOB.
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
