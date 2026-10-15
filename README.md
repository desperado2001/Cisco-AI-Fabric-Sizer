# Cisco AI Fabric Sizer

Standalone browser-based Cisco Secure AI Factory / AI Fabric BOM sizing tool.

## Canonical application
- `main/index.html`
- Current baseline: v67

## Current design decisions
- NVIDIA GB300 NVL72 OOB:
  - 1–2 racks may use direct handoff, simple STP aggregation, or spine-leaf OOB.
  - More than 2 NVL72 racks requires spine-leaf OOB.
- AMD MI355X / 8-GPU server profile:
  - Reuse the existing server-based HGX/NVL8-style sizing framework rather than the NVL72 rack-scale model.
  - Default AI backend switch: **Cisco N9364E-SG2X-O (Silicon One)**.
  - Do not make Spectrum-X a dependency for AMD.
  - Backend sizing must still follow the actual server NIC count, port speed, and NIC-to-GPU mapping; do not blindly copy NVIDIA NIC assumptions.

## Development workflow
Treat `main/index.html` as the source of truth. Commit meaningful changes with descriptive messages so future development can resume from GitHub without relying on chat history.
