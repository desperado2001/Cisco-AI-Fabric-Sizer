# Cisco AI Fabric Sizer

Standalone browser-based Cisco Secure AI Factory / AI Fabric BOM sizing tool.

## Canonical application
- `main/index.html`
- Current baseline: v69

## Current design decisions
- NVIDIA GB300 NVL72 OOB:
  - 1–2 racks may use direct handoff, simple STP aggregation, or spine-leaf OOB.
  - More than 2 NVL72 racks requires spine-leaf OOB.
- AMD MI355X / 8-GPU server profile:
  - Reuse the existing server-based HGX/NVL8-style sizing framework rather than the NVL72 rack-scale model.
  - Default AI backend switch: **Cisco N9364E-SG2X-O (Silicon One)**.
  - Do not make Spectrum-X a dependency for AMD.
  - Default backend assumption: **8 independent 400G RoCE NIC links per server**, equivalent to a 1:1 NIC-to-GPU planning mapping.
  - The UI exposes NICs per server, active link speed (200G/400G/800G), and single- or dual-plane placement. BOM, topology, switch counts, optics, and validation use those configured server-level values.
  - Dual-plane profiles should use an even NIC count for a balanced per-server split; odd counts are sized conservatively to the busier plane and called out for review.
  - The N9364E-SG2X-O is the recommended default, not a forced lock. An SE override is allowed but flagged for validation.

## Development workflow
Treat `main/index.html` as the source of truth. Commit meaningful changes with descriptive messages so future development can resume from GitHub without relying on chat history.

Run the JavaScript regression tests with `node --test tests/backend.test.js`.
