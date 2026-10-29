const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {calculator}=require('./helpers/calculator');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const api=new Function(html.slice(html.indexOf('function dist'),html.indexOf('function add(cat'))+
  ';return {nvl72BackendDesign,gb300EastWestDesign,backendPortConsumption,backendPortConsumptionHtml};')();
const design=(n,target=0)=>api.nvl72BackendDesign('gb300-nvl72',n,'cisco-cloud-ra',target);

test('Cloud RA backend matches every published switch, inter-switch optic and cable anchor',()=>{
  // Cisco Cloud RA 2026-09-08 Tables 2 and 3; totals across both planes.
  for(const [racks,leaves,spines,ss,optics,cables] of [
    [2,8,4,0,288,288],[4,16,6,0,576,576],[8,32,12,0,1152,1152],
    [16,64,18,0,2304,2304],[32,128,36,0,4608,4608],[64,256,72,0,9216,9216],
    [128,512,384,144,36864,36864],[256,1024,768,288,73728,73728],
    [512,2048,1536,576,147456,147456],[1024,4096,2304,1152,294912,294912]
  ]){
    const d=design(racks);
    assert.deepEqual([d.totalLeaves,d.totalSpines,d.totalSuperspines],[leaves,spines,ss],racks+' switches');
    assert.equal(d.leafSpineOptics+d.spineSuperOptics,optics,racks+' switch optics');
    assert.equal(d.leafSpineCables+d.spineSuperCables,cables,racks+' switch cables');
    assert.equal(d.hostOptics,racks*72);
    assert.equal(d.switchHostOptics,racks*72);
    assert.equal(d.hostLeafCables,racks*144);
    assert.equal(d.quantityAnchorVerified,true);
    assert.equal(d.fabricTier,ss?'3-tier':'2-tier');
  }
});

test('superspine capacity and optical endpoints independently reconcile across both layers',()=>{
  for(const racks of [128,256,512,1024]){
    const d=design(racks),p=api.backendPortConsumption(d);
    assert.equal(d.physicalLeafSpineLinks,d.totalLeaves*18);
    assert.equal(d.physicalSpineSuperLinks,d.totalSpines*d.spineUpCages);
    assert.equal(d.physicalSpineSuperLinks,d.totalSuperspines*64);
    assert.equal(d.spineDownCages,d.spineUpCages);
    assert.ok(p.spines.usedCages<=64);
    assert.equal(p.superspines.switchesPerPlane,d.totalSuperspines/2);
    assert.equal(p.superspines.downCages*d.totalSuperspines,d.physicalSpineSuperLinks);
    assert.equal(p.superspines.usedCages,64);
    assert.equal(p.superspines.freeCages,0);
    assert.ok(p.leaves.every(l=>l.usedCages<=64));
    assert.equal(d.physicalSpineSuperLinks*800,racks*72*800);
    assert.equal(d.spineSuperOptics,2*d.physicalSpineSuperLinks);
    assert.equal(d.spineSuperCables,2*d.physicalSpineSuperLinks);
    assert.equal(d.portMapVerified,false,'aggregate fit cannot assert exact group wiring');
  }
});

test('live and captured port tables include superspines, label peer roles, and retain unknown budgets',()=>{
  const d=design(104),p=api.backendPortConsumption(d),table=api.backendPortConsumptionHtml(d);
  assert.match(table,/<td>Superspine<\/td><td>72<\/td><td>—<\/td><td>0<\/td><td>0<\/td><td>56<\/td><td>0<\/td><td>56 \/ 64<\/td><td>8<\/td>/);
  assert.match(table,/<th>To spines<\/th><th>To superspines<\/th>/);
  assert.match(table,/aggregate RA planning port budgets/);
  const start=html.indexOf('function backendPortConsumptionSnapshotHtml');
  const snapshot=new Function(html.slice(start,html.indexOf('function exportProjectPhases',start))+';return backendPortConsumptionSnapshotHtml;')();
  assert.match(snapshot(p),/<td>Superspine<\/td><td>72<\/td><td>56 \/ 64<\/td><td>8<\/td>/);
  const old={...p};delete old.superspines;
  assert.doesNotThrow(()=>snapshot(old),'older captured tables remain readable');
  assert.equal(api.backendPortConsumption(design(64)).superspines,null);
  const unknown=api.backendPortConsumption(api.nvl72BackendDesign('gb300-nvl72',130));
  assert.equal(unknown.superspines.usedCages,null);
  assert.equal(unknown.superspines.freeCages,null);
});

test('RA reserves complete SU-groups without inventing GPUs or buying an entire larger leaf/spine anchor',()=>{
  for(const racks of [1,3,17,63,65,70,104,129,257,513]){
    const d=design(racks);
    assert.equal(d.gpus,racks*72);
    assert.equal(d.physicalHostLinks,racks*144);
    assert.equal(d.hostLeafCables,racks*144);
    assert.equal(d.hostLinkDist.reduce((a,b)=>a+b,0),racks*72);
    assert.ok(d.fabricRacks>=racks);
    assert.equal(d.switchHostOptics,d.fabricGpus);
    assert.equal(d.hostCageDist.reduce((a,b)=>a+b,0)*2,d.switchHostOptics);
  }
  const d=design(104);
  assert.deepEqual([d.fabricRacks,d.totalLeaves,d.totalSpines,d.totalSuperspines],[112,448,336,144]);
  assert.equal(d.raGroupCount,7);
  assert.equal(d.raGroupRacks,16);
  assert.equal(d.raCoreCapacityRacks,128);
  assert.equal(d.quantityAnchorVerified,false,'112 racks is an incremental derivation, not a Table 3 row');
  assert.equal(d.aggregatePortBudgetVerified,true);
  assert.deepEqual(d.hostLinkDist.filter(n=>n>0),Array(208).fill(36),'hosts stay in full two-rack SUs within each plane');
  assert.equal(d.hostLinkDist.filter(n=>n===0).length,16,'four reserved unused SUs per rail');
  assert.deepEqual([design(104,128).fabricRacks,design(104,128).totalLeaves,design(104,128).totalSpines],[128,512,384],'128-rack leaf/spine reservation requires an explicit growth target');
  assert.equal(design(64).totalSuperspines,0);
  assert.equal(design(65).totalSuperspines,144);
  assert.equal(design(8,128).totalSuperspines,144,'planned growth gets three tiers from day one');
  assert.equal(design(1025).quantityAnchorVerified,false);
});

test('engineering mode and non-GB300 profiles keep their existing backend calculations',()=>{
  for(const n of [2,64,70,104,128]){
    assert.deepEqual(api.nvl72BackendDesign('gb300-nvl72',n),api.nvl72BackendDesign('gb300-nvl72',n,'engineering'));
  }
  assert.equal(api.nvl72BackendDesign('gb300-nvl72',104).totalSuperspines,0);
  assert.deepEqual(api.nvl72BackendDesign('rubin-nvl72',4),api.nvl72BackendDesign('rubin-nvl72',4,'cisco-cloud-ra',128));
});

test('incremental RA sweep conserves SU locality, layer bandwidth and cage budgets through 1024 racks',()=>{
  for(let racks=1;racks<=1024;racks++){
    const d=design(racks),p=api.backendPortConsumption(d);
    assert.equal(d.hostLinkDist.reduce((a,b)=>a+b,0),racks*72);
    assert.ok(d.hostLinkDist.every(n=>[0,18,36].includes(n)),racks+' two-rack SU locality');
    assert.equal(d.hostLinkDist.filter(n=>n>0).length,4*Math.ceil(racks/2));
    assert.ok(d.fabricRacks>=racks);
    assert.ok(p.leaves.every(l=>l.usedCages+l.freeCages===64&&l.freeCages>=0));
    if(racks>64){
      assert.equal(d.fabricRacks%d.raGroupRacks,0);
      assert.ok(d.fabricRacks-racks<d.raGroupRacks);
      assert.ok(d.raCoreCapacityRacks>=d.fabricRacks);
      assert.equal(d.spineDownCages,d.spineUpCages);
      assert.ok(p.spines.usedCages<=64);
      assert.equal(d.physicalLeafSpineLinks,d.totalSpines*p.spines.downCages);
      assert.equal(d.physicalSpineSuperLinks,d.totalSpines*p.spines.upCages);
      assert.equal(d.physicalSpineSuperLinks,d.totalSuperspines*p.superspines.downCages);
      assert.ok(Number.isInteger(p.superspines.downCages)&&p.superspines.freeCages>=0);
      assert.equal(d.physicalSpineSuperLinks,d.fabricRacks*72);
      assert.equal(d.portMapVerified,false);
    }
  }
  const engineering=api.nvl72BackendDesign('gb300-nvl72',104);
  assert.equal(engineering.totalLeaves+engineering.totalSpines+engineering.totalSuperspines,368);
});

test('full calc carries RA quantities, spare uplift, failures and provenance into purchasing and facility state',()=>{
  const c=calculator(),r=c.run({platform:'gb300-nvl72',nodes:104,suMode:'off',gb300RaPolicy:'cisco-cloud-ra',sparePct:10});
  const d=r.design,b=d.backend;
  assert.equal(d.solution.totalGpus,7488);
  assert.equal(b.fabricRacks,112);
  assert.equal(b.totalLeaves+b.totalSpines+b.totalSuperspines,928);
  assert.equal(b.raCoreCapacityRacks,128);
  assert.equal(b.raBlockDerived,true);
  assert.equal(b.totalSuperspines,144);
  assert.equal(b.sourceTables,'Table 3');
  const ss=d.bom.find(r=>r.cat==='AI Backend Superspine');
  assert.equal(ss.required,144);assert.equal(ss.spare,15);assert.equal(ss.total,159);
  assert.match(ss.basis,/Cloud RA/);assert.match(ss.status,/Cloud RA FAIL/);
  assert.equal(d.bom.find(r=>r.desc==='MPO-12 SMF cable — spine to superspine').required,16128);
  assert.equal(r.physical.find(r=>/backend superspine/.test(r.name)).qty,144);
  assert.equal(d.referenceArchitecture.audit.status,'FAIL');
  assert.equal(d.layoutAudit.status,'FAIL');
  assert.ok(d.referenceArchitecture.audit.checks.some(c=>/OOB/.test(c.domain)&&c.status==='FAIL'));
  assert.ok(d.referenceArchitecture.audit.checks.some(c=>/frontend/.test(c.domain)&&c.status==='FAIL'));
  assert.match(c.controls.get('summary').innerHTML,/Cloud RA required: FAIL/);
  assert.match(c.controls.get('bomBody').innerHTML,/Cloud RA FAIL/);
  assert.ok(c.api.runComplianceAudit().rows.some(r=>r.key==='cisco-cloud-ra'&&r.status==='EXCEEDED'));
});

test('planned growth and incompatible independent SUs cannot bypass the RA requirement',()=>{
  const c=calculator(),d=c.run({platform:'gb300-nvl72',nodes:8,suMode:'custom',suNodes:2,suFabric:'independent',gb300RaPolicy:'cisco-cloud-ra',gb300RaTargetRacks:128}).design;
  assert.equal(d.backend.totalSuperspines,144);
  assert.equal(d.backend.fabricRacks,128);
  assert.ok(d.referenceArchitecture.audit.checks.some(c=>/shared fabric/.test(c.domain)&&c.status==='FAIL'));
  const tooLarge=calculator().run({platform:'gb300-nvl72',nodes:1025,suMode:'off',gb300RaPolicy:'cisco-cloud-ra'}).design;
  assert.equal(tooLarge.backend.quantityAnchorVerified,false);
  assert.ok(tooLarge.referenceArchitecture.audit.checks.some(c=>/backend capacity/.test(c.domain)&&c.status==='FAIL'));
});

test('saved deal profiles restore RA policy and planned capacity; old snapshots default to engineering',()=>{
  const store=new Map(),c=calculator({localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)}});
  c.run({platform:'gb300-nvl72',nodes:8,suMode:'off',gb300RaPolicy:'cisco-cloud-ra',gb300RaTargetRacks:128,'req-customer':'RA customer','req-deal-id':'RA-1'});
  const key=c.api.saveCurrentRequirements();assert.ok(key);
  c.run({platform:'b300',nodes:16,gb300RaPolicy:'engineering',gb300RaTargetRacks:0});
  c.api.loadRequirementProfile(key);
  assert.equal(c.window.DESIGN_STATE.backend.totalSuperspines,144);
  assert.equal(c.window.DESIGN_STATE.referenceArchitecture.policy,'cisco-cloud-ra');
  const db=JSON.parse(store.get('cisco_sizer_se_requirements_db'));
  delete db[key].sizing.inputs.gb300RaPolicy;delete db[key].sizing.inputs.gb300RaTargetRacks;
  store.set('cisco_sizer_se_requirements_db',JSON.stringify(db));
  c.api.loadRequirementProfile(key);
  assert.equal(c.window.DESIGN_STATE.referenceArchitecture.policy,'engineering');
  assert.equal(c.window.DESIGN_STATE.backend.totalSuperspines,0);
});
