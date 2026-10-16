const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = html.indexOf('function dist');
const end = html.indexOf('function frontendDesign');

assert.ok(start >= 0 && end > start, 'backend sizing functions must remain discoverable in index.html');

const api = new Function(
  `${html.slice(start, end)}; return { backendDesign, gb300EastWestDesign, gb300OobDesign, runBackendRegressionSuite, tmgQualified };`
)();

test('embedded backend regression suite passes', () => {
  const result = api.runBackendRegressionSuite();
  assert.equal(result.pass, true, JSON.stringify(result.failures, null, 2));
  assert.equal(result.failed, 0);
});

test('SE1 accepts supplied TMG-qualified OOB optics with spare PID normalization', () => {
  for(const pid of ['QSFP-40G-SR4-S','QSFP-100G-DR-S']) {
    assert.equal(api.tmgQualified('N9336C-SE1',pid),true);
    assert.equal(api.tmgQualified('N9336C-SE1',pid+'='),true);
  }
  assert.equal(api.tmgQualified('N9336C-SE1','UNVERIFIED-OPTIC'),false);
});

test('MI355X single-plane default conserves links, optics and switch capacity across scales', () => {
  const profile = {nicProfile:'amd-mi355x', profileBasis:'server', portMode:'sp_sp',
    planes:1, hostInterfaceSpeed:400, linkSpeed:400, linksPerServer:8, physicalPortsPerServer:8};
  for (const nodes of [1,4,16,32,64,80,128,563,630,1000,1024,1025,2048,4096]) {
    for (const topology of ['rail','classic']) {
      const d = api.backendDesign(nodes, 'custom', topology, 8, profile);
      assert.equal(d.planes, 1);
      assert.equal(d.physicalHostLinks, nodes*8);
      assert.equal(d.hostOptics, nodes*8);
      assert.equal(d.hostLinkDist.reduce((a,b)=>a+b,0), nodes*8);
      assert.equal(d.leafSpineOptics, d.physicalLeafSpineLinks*2);
      assert.ok(d.hostCageDist.every((c,i)=>c+d.uplinkDist[i]<=64));
      assert.ok(d.physicalLeafSpineLinks<=d.spinesPerPlane*64);
      assert.ok(d.physicalLeafSpineLinks*800>=nodes*8*400);
      assert.equal(d.ciscoCx8DualRA, false);
    }
  }
});

test('Cisco B300/CX8 published deck anchors remain exact', () => {
  for (const [g,leaves,spines,ss] of [
    [256,4,2,0],[512,8,4,0],[1024,16,8,0],[8192,128,64,0],
    [10240,160,160,128],[16384,256,256,128],[32768,512,512,256]
  ]) {
    const d=api.backendDesign(g/8,'dual400','rail',8,null);
    assert.deepEqual([d.leavesPerPlane,d.spinesPerPlane,d.superspinesPerPlane],[leaves,spines,ss]);
  }
});

test('GB300 OOB choices enforce the guardrail across deployment scales', () => {
  for (const racks of [1,2,3,8,16,32,64,72]) {
    for (const mode of ['auto','direct','stp','spine']) {
      const d=api.gb300OobDesign(racks,12,5,3,24,mode);
      assert.equal(d.inRackMgmtSwitches,racks*2);
      assert.equal(d.rackTor100gLinks,racks*4);
      if(racks>2)assert.equal(d.selectedMode,'spine');
      else assert.equal(d.selectedMode,mode==='auto'?'direct':mode);
    }
  }
});

test('OOB spine uses SE1 and flags its GB300 port capacity', () => {
  const within=api.gb300OobDesign(17,0,0,0,0,'spine');
  const beyond=api.gb300OobDesign(18,0,0,0,0,'spine');
  assert.equal(within.aggregationPid,'N9336C-SE1');
  assert.equal(within.spineCapacityExceeded,false);
  assert.equal(beyond.spineCapacityExceeded,true);
  assert.equal(html.includes('N9K-C9332C'),false);
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

test('NVIDIA B300/CX8 dual-plane remains two-tier at 5,040 and 8,192 GPUs', () => {
  const at5040 = api.backendDesign(630, 'dual400', 'rail', 8, null);
  const at8192 = api.backendDesign(1024, 'dual400', 'rail', 8, null);

  assert.equal(at5040.gpus, 5040);
  assert.equal(at5040.ciscoCx8DualRA, true);
  assert.equal(at5040.leavesPerPlane, 79);
  assert.equal(at5040.spinesPerPlane, 40);
  assert.equal(at5040.exceedsTwoTier, false);
  assert.equal(at5040.totalSuperspines, 0);
  assert.equal(at8192.gpus, 8192);
  assert.equal(at8192.ciscoCx8DualRA, true);
  assert.equal(at8192.leavesPerPlane, 128);
  assert.equal(at8192.spinesPerPlane, 64);
  assert.equal(at8192.exceedsTwoTier, false);
  assert.equal(at8192.totalSuperspines, 0);
});

test('NVIDIA B300/CX8 shared fabric interpolates instead of rounding to hard SUs', () => {
  const oneSu = api.backendDesign(64, 'dual400', 'rail', 8, null);
  const betweenTwoTierAnchors = api.backendDesign(80, 'dual400', 'rail', 8, null);
  const betweenThreeTierAnchors = api.backendDesign(1152, 'dual400', 'rail', 8, null);

  assert.deepEqual(
    [oneSu.gpus, oneSu.leavesPerPlane, oneSu.spinesPerPlane],
    [512, 8, 4]
  );
  assert.deepEqual(
    [betweenTwoTierAnchors.gpus, betweenTwoTierAnchors.leavesPerPlane, betweenTwoTierAnchors.spinesPerPlane],
    [640, 10, 5]
  );
  assert.deepEqual(
    [betweenThreeTierAnchors.gpus, betweenThreeTierAnchors.leavesPerPlane, betweenThreeTierAnchors.spinesPerPlane],
    [9216, 144, 144]
  );
});

test('MI355X UI preset stays on Cisco Silicon One without a Spectrum-X dependency', () => {
  assert.match(
    html,
    /if\(isAmdMi355x\)[\s\S]*?backendSwitch'\)\.value='N9364E-SG2X-O'/,
    'MI355X platform selection must preset N9364E-SG2X-O'
  );
  assert.match(
    html,
    /AMD default:[\s\S]*?Spectrum-X is not required\./,
    'MI355X guidance must remain independent of Spectrum-X'
  );
});

test('MI355X large-scale validation does not route the review to NVIDIA', () => {
  assert.match(
    html,
    /isAmdMi355x\?'LARGE-SCALE FABRIC VALIDATION':'ARCHITECTURE REVIEW'/,
    'MI355X must use AMD-specific large-scale validation wording'
  );
  assert.match(
    html,
    /Cisco, AMD, and the selected server\/NIC vendor/,
    'MI355X large-scale reviews must identify the correct validation parties'
  );
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

test('GB300 OOB guardrail preserves small-rack choices and forces spine-leaf above two racks', () => {
  const direct = api.gb300OobDesign(2, 0, 0, 0, 0, 'direct');
  const stp = api.gb300OobDesign(2, 0, 0, 0, 0, 'stp');
  const forced = api.gb300OobDesign(3, 0, 0, 0, 0, 'direct');

  assert.equal(direct.selectedMode, 'direct');
  assert.equal(direct.guardrailForced, false);
  assert.equal(stp.selectedMode, 'stp');
  assert.equal(stp.guardrailForced, false);
  assert.equal(forced.selectedMode, 'spine');
  assert.equal(forced.guardrailForced, true);
  assert.equal(forced.oobSpines, 2);
  assert.equal(forced.simpleOob, false);
});
