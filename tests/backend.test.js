const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = html.indexOf('function dist');
const end = html.indexOf('function frontendDesign');

assert.ok(start >= 0 && end > start, 'backend sizing functions must remain discoverable in index.html');

const api = new Function(
  `${html.slice(start, end)}; return { backendDesign, gb300EastWestDesign, runBackendRegressionSuite };`
)();

test('embedded backend regression suite passes', () => {
  const result = api.runBackendRegressionSuite();
  assert.equal(result.pass, true, JSON.stringify(result.failures, null, 2));
  assert.equal(result.failed, 0);
});

test('MI355X default uses eight 400G server NICs without NVIDIA-specific geometry', () => {
  const profile = {
    nicProfile: 'amd-mi355x',
    profileBasis: 'server',
    portMode: 'sp_sp',
    planes: 1,
    hostInterfaceSpeed: 400,
    linkSpeed: 400,
    linksPerServer: 8,
    physicalPortsPerServer: 8
  };
  const design = api.backendDesign(16, 'custom', 'rail', 8, profile);

  assert.equal(design.gpus, 128);
  assert.equal(design.profileBasis, 'server');
  assert.equal(design.physicalHostLinks, 128);
  assert.equal(design.hostOptics, 128);
  assert.equal(design.ciscoCx8DualRA, false);
});

test('MI355X switch and optic demand follows configured server NIC assumptions', () => {
  const profile = {
    nicProfile: 'amd-mi355x',
    profileBasis: 'server',
    portMode: 'dp_dp',
    planes: 2,
    hostInterfaceSpeed: 200,
    linkSpeed: 200,
    linksPerServer: 4,
    physicalPortsPerServer: 4
  };
  const design = api.backendDesign(16, 'custom', 'rail', 8, profile);

  assert.equal(design.gpus, 128);
  assert.equal(design.planes, 2);
  assert.equal(design.speed, 200);
  assert.equal(design.physicalHostLinks, 64);
  assert.equal(design.hostOptics, 64);
});

test('GB300 NVL72 sizing anchor remains unchanged', () => {
  const design = api.gb300EastWestDesign(2);

  assert.deepEqual(
    {
      gpus: design.gpus,
      totalLeaves: design.totalLeaves,
      totalSpines: design.totalSpines,
      hostOptics: design.hostOptics,
      leafSpineOptics: design.leafSpineOptics,
      fabricRacks: design.fabricRacks
    },
    {
      gpus: 144,
      totalLeaves: 8,
      totalSpines: 4,
      hostOptics: 144,
      leafSpineOptics: 288,
      fabricRacks: 2
    }
  );
});
