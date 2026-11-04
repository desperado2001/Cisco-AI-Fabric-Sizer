const test=require('node:test');
const assert=require('node:assert/strict');
const {calculator}=require('./helpers/calculator');

const audit=(values,features={})=>{
  const c=calculator(),d=c.run({suMode:'off','req-ncpra':'guide',...values},features).design;
  c.api.runComplianceAudit();
  return {c,d,n:d.ncpraRequirements,check:id=>d.ncpraRequirements.checks.find(x=>x.id===id)};
};
const strip=d=>JSON.stringify({...d,ncpraRequirements:undefined});

test('NCRA option leaves platforms without an NCRA fabric unchanged',()=>{
  for(const platform of ['amd-mi355x','h200','custom'])for(const nodes of [1,8,70]){
    const off=calculator(),on=calculator();
    const a=off.run({platform,nodes,suMode:'off','req-ncpra':'off'}).design;off.api.runComplianceAudit();
    const b=on.run({platform,nodes,suMode:'off','req-ncpra':'guide'}).design;on.api.runComplianceAudit();
    assert.equal(strip(b),strip(a),platform+'/'+nodes);
  }
  const {d}=audit({platform:'rubin-nvl72',nodes:8});
  assert.equal(d.compute.computePowerKw,0);
});

test('NCRA Vera Rubin places N9164F-NS6-ML on the 102.4T / 1.6T-cage geometry',()=>{
  for(const platform of ['rubin-nvl72','rubin-hgx','rubin-nvl8-rack']){
    const {c,d}=audit({platform,nodes:8});
    assert.equal(d.backend.switchPid,'N9164F-NS6-ML');
    assert.equal(d.backend.ncraSwitchOverride,true);
    assert.equal(d.backend.g300Planning,false);
    assert.equal(d.backend.switchAsic,'NVIDIA Spectrum-6');
    assert.equal(d.backend.switchCapacityTbps,102.4);
    assert.equal(d.backend.cageSpeedG,1600);
    assert.equal(d.backend.aggregatePerGpu,1600);
    if(platform==='rubin-nvl72'){assert.equal(d.backend.speed,200);assert.equal(d.backend.planes,8);}
    else{assert.equal(d.backend.speed,800);assert.equal(d.backend.planes,2);}
    assert.ok(d.bom.filter(r=>['AI Backend Leaf','AI Backend Spine'].includes(r.cat)).every(r=>r.pid==='N9164F-NS6-ML'&&r.status.includes('Spectrum-6 102.4T')));
    assert.ok(d.bom.filter(r=>r.cat==='AI Backend Optics').every(r=>r.pid==='TBD-1600G-NS6-SWITCH'));
    assert.equal(d.bom.find(r=>r.pid==='TBD-NS6-CABLING').required,1);
    assert.ok(!d.bom.some(r=>['N9164E-NS4-O','CB-M12-M12-SMF'].includes(r.pid)&&/^AI Backend/.test(r.cat)));
    assert.ok(c.window.LAST_PHYS_ROWS.filter(r=>r.name.includes('NS6')).every(r=>r.powerKnown===false&&r.weightKnown===false));
    assert.match(c.controls.get('facilitySummary').innerHTML,/INCOMPLETE — Spectrum-6/);
    assert.ok(d.layoutAudit.checks.some(x=>x.domain==='Spectrum-6 physical and optical qualification'&&x.status==='REVIEW'));
    assert.equal(c.controls.get('backendSwitch').disabled,true);
    assert.equal(c.window.LAST_BACKEND_REGRESSION.pass,true);
  }
});

test('turning NCRA off restores the selected Rubin backend switch and 51.2T math',()=>{
  const c=calculator();
  const base=c.run({platform:'rubin-nvl72',nodes:8,suMode:'off','req-ncpra':'off'}).design;
  const ncra=c.run({'req-ncpra':'guide'}).design;
  assert.equal(ncra.backend.switchPid,'N9164F-NS6-ML');
  assert.equal(c.controls.get('backendSwitch').value,'N9164E-NS4-O');
  const back=c.run({'req-ncpra':'off'}).design;
  assert.equal(back.backend.switchPid,'N9164E-NS4-O');
  assert.deepEqual([back.backend.totalLeaves,back.backend.totalSpines],[base.backend.totalLeaves,base.backend.totalSpines]);
  assert.deepEqual([back.backend.totalLeaves,back.backend.totalSpines],[40,20]);
  assert.equal(c.controls.get('backendSwitch').disabled,false);
});

test('NS6-ML liquid target is satisfied, not unmet, when NCRA places it for Rubin',()=>{
  const {d,c}=audit({platform:'rubin-nvl72',nodes:8,backendCoolingOption:'N9164F-NS6-ML'});
  const q=d.backend.coolingQualification;
  assert.equal(q.required,true);assert.equal(q.met,true);assert.equal(q.status,'REVIEW');assert.equal(q.appliedToSizing,true);
  assert.ok(!d.layoutAudit.checks.some(x=>x.domain==='Backend liquid cooling'));
  assert.ok(!c.api.runComplianceAudit().rows.some(r=>r.key==='backend-liquid-cooling'));
  assert.match(c.controls.get('backendCoolingNote').innerHTML,/NCRA Vera Rubin backend: N9164F-NS6-ML placed/);
});

test('NCRA Rubin selection survives deal-profile save and restore',()=>{
  const store=new Map(),c=calculator({localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)}});
  c.run({platform:'rubin-nvl72',nodes:8,suMode:'off','req-ncpra':'guide','req-customer':'Rubin NCRA','req-deal-id':'NCRA-1'});
  const key=c.api.saveCurrentRequirements();assert.ok(key);
  c.run({'req-ncpra':'off'});assert.equal(c.window.DESIGN_STATE.backend.switchPid,'N9164E-NS4-O');
  c.api.loadRequirementProfile(key);
  assert.equal(c.window.DESIGN_STATE.backend.switchPid,'N9164F-NS6-ML');
});

test('Vera Rubin NVL72 applies the guide hardware profile and matches 1.6T/GPU scale-out',()=>{
  const {n,check}=audit({platform:'rubin-nvl72',nodes:8});
  assert.equal(n.platformProfile.name,'Vera Rubin NVL72');
  assert.equal(n.platformProfile.scaleOutPerGpuG,1600);
  const p=check(0);
  assert.equal(p.status,'REVIEW');
  assert.match(p.evidence,/18 × BlueField-4 800G/);
  assert.match(p.evidence,/144 × 800G ConnectX-9/);
  assert.match(p.evidence,/3\.6 TB\/s/);
  assert.match(p.evidence,/matches the guide 1600G\/GPU/);
  assert.equal(n.checks.length,9);
});

test('NCRA Rubin NVL8 moves to 2×800G/GPU and matches the guide 1.6T profile',()=>{
  for(const platform of ['rubin-hgx','rubin-nvl8-rack']){
    const {d,check}=audit({platform,nodes:8});
    assert.equal(d.backend.aggregatePerGpu,1600);
    assert.match(check(0).evidence,/matches the guide 1600G\/GPU/);
    assert.match(check(0).evidence,/N9164F-NS6-ML \(102\.4T, placed by the NCRA option\)/);
    assert.ok(d.bom.some(r=>r.pid==='TBD-800G-CX9-NCRA-HOST'));
    assert.ok(d.qa.some(q=>q.includes('Rubin NVL8 NCRA networking profile')));
    assert.ok(d.qa.some(q=>q.includes('Rubin NVL8 facilities model')));
  }
});

test('HPS check separates storage throughput, network targets and the checkpoint write rule',()=>{
  const {n,check}=audit({platform:'rubin-nvl72',nodes:8});
  const [read,write,heavy]=n.hps.targets;
  assert.deepEqual([read.gbpsPerGpu,write.gbpsPerGpu,heavy.gbpsPerGpu],[1.5,0.75,4]);
  assert.equal(read.aggregateGBps,576*1.5/8);
  assert.equal(read.eboxesForLineRate,Math.ceil(576*1.5/400));
  assert.equal(heavy.eboxesForLineRate,Math.ceil(576*4/400));
  assert.deepEqual(n.hps.coreToHps,{gbpsPerGpu:16,aggregateGbps:576*16});
  assert.equal(n.hps.lineRateGbps,12*400);
  assert.equal(n.hps.checkpoint.syncMaxParamsB,(4800/8)*3600*0.01/14);
  assert.equal(n.hps.checkpoint.asyncMaxParamsB,(4800/8)*3600*0.10/14);
  assert.equal(check(3).status,'REVIEW');
  assert.match(check(3).evidence,/core-to-HPS target: 16 Gbps\/GPU/);
  assert.match(check(3).evidence,/not to the maximum network bandwidth/);
  const short=audit({platform:'rubin-nvl72',nodes:45});
  assert.equal(short.n.hps.lineRateShortfall,true);
  assert.equal(short.check(3).status,'FAIL');
  assert.match(short.check(3).evidence,/below the 1\.5 Gbps\/GPU standard read guidance/);
  assert.equal(audit({platform:'rubin-nvl72',nodes:45,eboxQty:13}).check(3).status,'REVIEW');
  assert.equal(audit({platform:'rubin-nvl72',nodes:8},{vastToggle:false}).check(3).status,'REVIEW');
  const gb=audit({platform:'gb300-nvl72',nodes:8});
  assert.equal(gb.n.hps.targets.length,0);
  assert.equal(gb.n.hps.coreToHps.gbpsPerGpu,8.5);
  assert.match(gb.check(3).evidence,/not in the NCRA guide/);
});

test('Rubin rack power profiles are reported for review without entering facility totals',()=>{
  const {d,n,check}=audit({platform:'rubin-nvl72',nodes:8});
  assert.deepEqual(n.facilityGuide.unitKw,[156,227]);
  assert.deepEqual(n.facilityGuide.clusterKw,[156*8,227*8]);
  assert.equal(n.facilityGuide.edpKva,240);
  assert.equal(n.facilityGuide.modeledUnitKw,null);
  assert.match(check(8).evidence,/MaxLPS 156 kW · MaxQ 187 kW · MaxP 227 kW/);
  assert.match(check(8).evidence,/not added to facility totals/);
  assert.match(check(8).evidence,/PUE are not specified in the guide/);
  assert.equal(d.facility.computePowerKw,0);
  const nvl8=audit({platform:'rubin-hgx',nodes:8});
  assert.equal(nvl8.n.facilityGuide.modeledUnitKw,24);
  assert.equal(nvl8.n.facilityGuide.withinGuide,false);
  assert.equal(nvl8.n.facilityGuide.verified,false);
  assert.match(nvl8.check(8).evidence,/product data governs/);
  assert.match(nvl8.check(0).evidence,/not yet verified/);
});

test('platforms without a guide profile keep the generic eight checks',()=>{
  const {n}=audit({platform:'amd-mi355x',nodes:8});
  assert.equal(n.platformProfile,null);
  assert.equal(n.checks.length,8);
  assert.equal(n.checks.find(c=>c.id===3).status,'REVIEW');
});

const html=require('node:fs').readFileSync(require('node:path').join(__dirname,'..','index.html'),'utf8');
const octal=new Function(html.slice(html.indexOf('function dist'),html.indexOf('function add(cat'))+
  ';return {ncraRubinOctalPlaneDesign,backendPortConsumption};')();

test('NCRA Rubin NVL72 octal-plane fabric conserves lanes, stays 1:1 and fits every switch',()=>{
  for(const racks of [1,13,14,15,27,28,42,56,70,112,113,114,126,224,238,448,462,896,910,1792]){
    const d=octal.ncraRubinOctalPlaneDesign(racks),p=octal.backendPortConsumption(d),su=Math.ceil(racks/14);
    assert.equal(d.portMapVerified,true,racks+' racks');
    assert.equal(d.fabricTier,'2-tier');
    assert.equal(d.totalSuperspines,0);
    assert.equal(d.scalableUnits,su);
    assert.equal(d.leavesPerPlane,4*su);
    assert.equal(d.totalLeaves,32*su);
    assert.equal(d.planes,8);assert.equal(d.speed,200);assert.equal(d.aggregatePerGpu,1600);
    assert.equal(d.hostLinkDist.reduce((a,b)=>a+b,0),racks*72);
    assert.equal(d.railMappingVerified,true);
    const up=d.meshLinksPerPair*d.spinesPerPlane;
    assert.ok(up>=14*18,'1:1 uplinks '+racks);
    assert.ok(d.meshLinksPerPair*d.leavesPerPlane<=512,'spine radix '+racks);
    p.leaves.forEach(l=>assert.ok(l.usedCages<=64));
    assert.ok(p.spines.usedCages<=64);
    assert.equal(d.hostLeafCables,racks*144);
    assert.equal(d.leafSpineShuffle,su>32);
  }
});

test('octal-plane spines are provisioned per power-of-two SU band so growth only adds leaves',()=>{
  const spines=su=>octal.ncraRubinOctalPlaneDesign(su*14).totalSpines;
  for(const [lo,hi] of [[3,4],[5,8],[9,16],[17,32],[33,64],[65,128]]){
    assert.equal(spines(lo),spines(hi));
    assert.ok(spines(lo)>spines(lo-1));
  }
  assert.equal(octal.ncraRubinOctalPlaneDesign(14).totalSpines,16);
  assert.equal(octal.ncraRubinOctalPlaneDesign(14*128).twoTierGpuCeiling,129024);
  const over=octal.ncraRubinOctalPlaneDesign(14*128+1);
  assert.equal(over.portMapVerified,false);assert.equal(over.fabricTier,'3-tier review');
});

test('calculator uses the octal-plane fabric for NCRA Rubin NVL72 and no superspine through 128 SUs',()=>{
  const {c,d}=audit({platform:'rubin-nvl72',nodes:114});
  assert.equal(d.backend.fabricTier,'2-tier');
  assert.equal(d.backend.totalSuperspines,0);
  assert.equal(d.backend.switchPid,'N9164F-NS6-ML');
  assert.equal(d.backend.totalLeaves,octal.ncraRubinOctalPlaneDesign(114).totalLeaves);
  assert.ok(d.bom.some(r=>r.pid==='TBD-1600G-CX9-OCTAL-HOST'&&r.required===114*72));
  assert.match(c.controls.get('g300PlanningNote').innerHTML,/octal-plane design/);
  assert.equal(c.window.LAST_BACKEND_REGRESSION.pass,true);
  const off=calculator().run({platform:'rubin-nvl72',nodes:114,suMode:'off'}).design;
  assert.equal(off.backend.planes,2);assert.equal(off.backend.switchPid,'N9164E-NS4-O');
});

const quad=new Function(html.slice(html.indexOf('function dist'),html.indexOf('function add(cat'))+
  ';return {ncraQuadPlaneDesign,backendPortConsumption};')();

test('NCRA quad-plane fabric conserves lanes, stays 1:1 and fits every switch for GB300 and B300',()=>{
  const cases={'gb300-nvl72':[1,6,7,8,13,14,21,35,63,70,77,113,119,224,231,448,449,896,1792],b300:[1,63,64,65,128,1000,1024,1025,2048,4096,4097,8192,16384]};
  for(const [platform,units] of Object.entries(cases))for(const u of units){
    const d=quad.ncraQuadPlaneDesign(platform,u),p=quad.backendPortConsumption(d),gb=platform==='gb300-nvl72';
    const suUnits=gb?7:64,su=Math.ceil(u/suUnits),gpus=u*(gb?72:8);
    assert.equal(d.portMapVerified,true,platform+' '+u);
    assert.equal(d.planes,4);assert.equal(d.speed,200);assert.equal(d.aggregatePerGpu,800);
    assert.equal(d.scalableUnits,su);assert.equal(d.leavesPerPlane,4*su);
    assert.equal(d.hostLinkDist.reduce((a,b)=>a+b,0),gpus);
    assert.equal(d.railMappingVerified,true);
    assert.equal(d.hostLeafCables,gpus*2);
    assert.equal(d.fabricTier,su<=64?'2-tier':'3-tier');
    assert.equal(d.totalSuperspines>0,su>64);
    assert.ok(d.meshLinksPerPair*(d.totalSuperspines?8:d.spinesPerPlane)>=suUnits*(gb?72:8)/4,'1:1 '+u);
    p.leaves.forEach(l=>assert.ok(l.usedCages<=64));
    assert.ok(p.spines.usedCages<=64);
    if(p.superspines)assert.ok(p.superspines.usedCages<=64);
  }
  assert.equal(quad.ncraQuadPlaneDesign('gb300-nvl72',1793).portMapVerified,false);
  assert.equal(quad.ncraQuadPlaneDesign('b300',16385).portMapVerified,false);
});

test('NCRA B300 quad-plane matches the existing B300 counts through 1,024 nodes and drops superspines above',()=>{
  for(let n=64;n<=1024;n+=64){
    const cur=calculator().run({platform:'b300',nodes:n,suMode:'off'}).design.backend,d=quad.ncraQuadPlaneDesign('b300',n);
    assert.deepEqual([d.totalLeaves,d.totalSpines],[cur.totalLeaves,cur.totalSpines],n+' nodes');
  }
  const {c,d}=audit({platform:'b300',nodes:2048,backendSwitch:'N9364E-SG2X-O',b300mode:'single800'});
  assert.equal(d.backend.switchPid,'N9164E-NS4-O');
  assert.equal(d.backend.planes,4);
  assert.equal(d.backend.totalSuperspines,0);
  assert.equal(d.backend.fabricTier,'2-tier');
  assert.equal(c.controls.get('b300mode').disabled,true);
  assert.equal(c.controls.get('backendSwitch').disabled,true);
  assert.ok(d.bom.some(r=>r.pid==='TBD-QUAD-PLANE-SHUFFLE'));
  assert.ok(d.qa.some(q=>q.includes('NCRA QUAD-PLANE')));
  const off=c.run({'req-ncpra':'off'}).design;
  assert.equal(off.backend.planes,1);
  assert.equal(off.backend.fabricTier,'3-tier review');
  assert.equal(off.backend.switchPid,'N9364E-SG2X-O');
  assert.equal(c.controls.get('b300mode').disabled,false);
});

test('NCRA sets the GB300 fabric over Cisco Cloud RA and restores it when turned off',()=>{
  const {c,d}=audit({platform:'gb300-nvl72',nodes:70,gb300RaPolicy:'cisco-cloud-ra'});
  assert.equal(d.backend.planes,4);
  assert.equal(d.backend.fabricTier,'2-tier');
  assert.equal(d.backend.totalSuperspines,0);
  assert.equal(d.backend.scalability.topologyLimitRacksPerFabric,448);
  assert.equal(d.backend.scalability.ciscoRaTwoTierLimitRacks,64);
  assert.equal(d.referenceArchitecture.policy,'engineering');
  assert.match(c.controls.get('gb300RaPolicyNote').innerHTML,/NCRA requirements option sets the GB300 fabric/);
  assert.match(c.controls.get('fabricScaleNote').innerHTML,/NCRA quad-plane 2-tier fabric/);
  assert.ok(!d.layoutAudit.checks.some(x=>x.domain.startsWith('Cisco Cloud RA')));
  const off=c.run({'req-ncpra':'off'}).design;
  assert.equal(off.backend.planes,2);
  assert.ok(off.backend.totalSuperspines>0);
  assert.equal(off.referenceArchitecture.policy,'cisco-cloud-ra');
});

test('B300 NCRA profile reports ConnectX-8, storage guidance and unspecified power',()=>{
  const {n,check}=audit({platform:'supermicro-b300',nodes:64});
  assert.equal(n.platformProfile.scaleOutPerGpuG,800);
  assert.match(check(0).evidence,/8 × 800G ConnectX-8/);
  assert.match(check(0).evidence,/matches the guide 800G\/GPU/);
  assert.match(check(2).evidence,/Modeled rail distribution is symmetric/);
  assert.deepEqual(n.hps.targets.map(t=>t.gbpsPerGpu),[1.33,0.67,4]);
  assert.equal(n.hps.coreToHps.gbpsPerGpu,8.5);
  assert.equal(n.facilityGuide.powerProfiles,null);
  assert.match(check(8).evidence,/power per node is not specified in the guide/);
});
