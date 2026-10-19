const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = html.indexOf('function dist');
const end = html.indexOf('function frontendDesign');

assert.ok(start >= 0 && end > start, 'backend sizing functions must remain discoverable in index.html');

const api = new Function(
  `${html.slice(start, end)}; return { backendDesign, gb300EastWestDesign, gb300OobDesign, runBackendRegressionSuite, tmgQualified, twoTierPortPlan, completeMeshPlan };`
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

test('OOB spine uses SE1 and adds redundant blocks at capacity boundaries', () => {
  const within=api.gb300OobDesign(16,0,0,0,0,'spine');
  const beyond=api.gb300OobDesign(17,0,0,0,0,'spine');
  assert.equal(within.aggregationPid,'N9336C-SE1');
  assert.equal(within.spineCapacityExceeded,false);
  assert.equal(beyond.spineCapacityExceeded,false);
  assert.ok(beyond.oobSpines>within.oobSpines);
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
  assert.equal(at5040.leavesPerPlane, 80);
  assert.equal(at5040.spinesPerPlane, 64);
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
    [640, 10, 8]
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

test('GB300 selects tiers from a complete 1:1 port mapping rather than 64 racks', () => {
  for(const racks of [65,70,96,112,113]) {
    const design=api.gb300EastWestDesign(racks);
    assert.equal(design.fabricTier,'2-tier');
    assert.equal(design.totalSuperspines,0);
    assert.ok(design.hostCageDist.every((n,i)=>n+design.uplinkDist[i]<=64));
    assert.ok(design.leavesPerPlane*design.linksPerLeafSpinePair400<=128);
    assert.ok(design.linksPerLeafSpinePair400*design.spinesPerPlane>=Math.max(...design.hostLinkDist));
    assert.ok(Number.isInteger(design.linksPerLeafSpinePair400));
    assert.equal(design.physicalLeafSpineLinks,design.totalLeaves*design.uplinkDist[0]);
  }
  const at70=api.gb300EastWestDesign(70);
  assert.deepEqual([at70.totalLeaves,at70.totalSpines,at70.totalSuperspines],[160,128,0]);
  const d=api.gb300EastWestDesign(114);
  assert.ok(d.physicalLeafSpineLinks<=d.totalSpines*64);
  assert.equal(d.validatedScaleExceeded,true);
  assert.equal(d.fabricTier,'3-tier');
  for(const racks of [114,120,128]) {
    const design=api.gb300EastWestDesign(racks);
    assert.equal(design.derivedCapacityExceeded,false);
    assert.equal(design.physicalLeafSpineLinks,design.physicalSpineSuperLinks);
    assert.ok(24+24<=64);
    const distribution=Array.from({length:design.ssPerCore},(_,i)=>Math.floor(24/design.ssPerCore)+(i<24%design.ssPerCore?1:0));
    assert.equal(distribution.reduce((a,b)=>a+b,0),24);
    assert.ok(distribution.every(links=>Number.isInteger(links)&&links>0&&links*design.raScaleUnits<=64));
    assert.equal(design.spineSuperOptics,design.physicalSpineSuperLinks*2);
  }
  assert.equal(api.gb300EastWestDesign(130).derivedCapacityExceeded,true);
});

test('two-tier capacity follows link speed and switch radix across reference plane modes', () => {
  for(const [gpus,speed,rails,capacity] of [[8192,400,8,51200],[32768,200,8,51200],[129024,200,4,102400]]) {
    const d=api.twoTierPortPlan(gpus,speed,rails,capacity);
    assert.ok(d,`reference ${gpus} links/plane at ${speed}G fits`);
    assert.ok(d.leaves*d.pairLinks<=d.radix);
    assert.ok(d.uplinks>=Math.max(...d.host));
  }
  assert.equal(api.twoTierPortPlan(8193,400,4),null);
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

// Independently check pair counts, bandwidth and physical cage budgets.
function assertWholeMesh(d) {
  assert.equal(d.portMapVerified,true);
  const pair=d.meshLinksPerPair, perCage=800/d.meshLinkSpeedG;
  assert.ok(Number.isInteger(pair)&&pair>0);
  for(let i=0;i<d.leavesPerPlane;i++) {
    assert.equal(d.uplinkDist[i]*perCage,d.spinesPerPlane*pair);
    assert.ok(d.spinesPerPlane*pair>=d.hostLinkDist[i]);
    assert.ok(d.hostCageDist[i]+d.uplinkDist[i]<=64);
  }
  assert.ok(Math.ceil(d.leavesPerPlane*pair/perCage)<=64);
  assert.equal(d.physicalLeafSpineLinks,d.uplinkDist.reduce((a,b)=>a+b,0)*d.planes);
  assert.equal(d.logicalLeafSpineLinks,d.leavesPerPlane*d.spinesPerPlane*pair*d.planes);
  assert.equal(d.leafSpineOptics,d.physicalLeafSpineLinks*2);
}

test('600 AMD servers use 76 leaves and 64 fully connected 400G spines',()=>{
  const d=api.backendDesign(600,'custom','rail',8,{nicProfile:'amd-mi355x',profileBasis:'server',planes:1,linksPerServer:8,linkSpeed:400});
  assert.deepEqual([d.totalLeaves,d.totalSpines,d.meshLinksPerPair,d.spineCagesUsed],[76,64,1,38]);
  assert.deepEqual([d.switchHostOptics,d.leafSpineOptics],[2432,4864]);
  assertWholeMesh(d);
});

test('whole-link mapping covers AMD, CX7, CX8, CX9 and 800G profiles at intermediate scales',()=>{
  for(const nodes of [1,16,32,80,563,600,630,1024]) {
    for(const speed of [200,400,800])for(const planes of [1,2]) {
      for(const nicProfile of ['amd-mi355x','cx7','cx8','cx9-rubin']) {
        const d=api.backendDesign(nodes,'custom','rail',8,{nicProfile,profileBasis:'server',planes,linksPerServer:8,linkSpeed:speed});
        if(d.portMapVerified)assertWholeMesh(d);
        else assert.equal(d.exceedsTwoTier,true);
      }
    }
    const d=api.backendDesign(nodes,'dual400','rail',8,null);
    assertWholeMesh(d);
  }
});

test('800G two-tier overflow and unverified three-tier estimates cannot claim a valid mesh',()=>{
  const d=api.backendDesign(600,'single800','rail',8,null);
  assert.equal(d.portMapVerified,false);
  assert.equal(d.exceedsTwoTier,true);
  assert.equal(api.backendDesign(1152,'dual400','rail',8,null).portMapVerified,false);
  assert.equal(api.completeMeshPlan(Array(76).fill(32),800),null);
  assert.ok(!html.includes('nonBlocking:!!be.ciscoCx8DualRA || true'));
});

test('frontend respects its selected oversubscription on every whole-link mesh',()=>{
  const make=new Function(html.slice(start,end)+html.slice(html.indexOf('function frontendDesign'),html.indexOf('function add(cat'))+'; return frontendDesign;')();
  for(const n of [32,80,600,1000])for(const over of [1,2,3])for(const external of [0,48]){
    const d=make(n,5,2,over,external);
    assert.equal(d.portMapVerified,true);
    for(let i=0;i<d.leaves;i++){
      assert.equal(d.uplinkDist[i],d.spines*d.meshLinksPerPair);
      assert.ok(d.uplinkDist[i]*400>=d.endpointDist[i]*200/over);
      assert.ok(d.hostCageDist[i]+d.uplinkDist[i]<=64);
    }
    assert.ok(d.leaves*d.meshLinksPerPair+Math.ceil(external/d.spines)<=64);
    assert.equal(d.physicalUplinkLinks,d.uplinkDist.reduce((a,b)=>a+b,0));
  }
});
