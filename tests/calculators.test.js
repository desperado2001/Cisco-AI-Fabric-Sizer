const assert=require('node:assert/strict');
const test=require('node:test');
const {calculator}=require('./helpers/calculator');
const profiles=['b300','h200','supermicro-b300','amd-mi355x','gb300-nvl72','rubin-nvl72','rubin-hgx','rubin-nvl8-rack','custom'];
const sum=(rows,key)=>rows.reduce((s,r)=>s+(r[key]||0),0);
test('400G DR4 host paths separate host optics, switch optics and branch cables',()=>{
  const d=calculator().run({platform:'amd-mi355x'}).design;
  const quantity=cat=>sum(d.bom.filter(r=>r.cat===cat),'required');
  assert.equal(quantity('AI Backend Host Optics'),160);
  assert.equal(quantity('AI Backend Cabling'),160);
  const hostSwitch=d.bom.find(r=>r.cat==='AI Backend Optics'&&/host-facing/.test(r.desc||r.description||''));
  assert.ok(hostSwitch);
  assert.equal(hostSwitch.required,80);
});
function near(actual,expected,label){assert.ok(Math.abs(actual-expected)<1e-6,`${label}: ${actual} vs ${expected}`);}
function reconcile(r,label){
  const d=r.design,f=d.facility;
  near(f.totalPowerKw,sum(r.physical,'totalPowerW')/1000,label+' physical power');
  near(f.totalWeightKg,sum(r.physical,'totalWeightKg'),label+' physical weight');
  near(f.totalPowerKw,f.computePowerKw+f.switchPowerKw+f.storagePowerKw+f.managementPowerKw+f.nexusDashboardPowerKw+f.cdu.totalPowerW/1000,label+' subsystem power');
  near(f.totalWeightKg,sum(r.racks,'weightKg')+(f.cdu.placement!=='in-rack'?f.cdu.totalWeightKg:0),label+' rack and external CDU weight');
  near(f.totalPowerKw,(sum(r.racks,'powerW')+(f.cdu.placement!=='in-rack'?f.cdu.totalPowerW:0))/1000,label+' rack and external CDU power');
  assert.equal(f.rackCount,r.racks.length,label+' rack count');
  assert.equal(d.solution.totalGpus,d.compute.units*d.compute.gpusPerUnit,label+' GPUs');
  assert.equal(sum(d.bom.filter(x=>x.cat==='AI Backend Leaf'),'required'),d.backend.totalLeaves,label+' backend leaves');
  assert.equal(sum(d.bom.filter(x=>x.cat==='AI Backend Spine'),'required'),d.backend.totalSpines,label+' backend spines');
  if(d.storage.enabled){
    assert.equal(sum(d.bom.filter(x=>x.pid==='UCSC-C225M8N-EBOX'),'required'),d.storage.eboxes,label+' EBoxes');
    assert.equal(sum(d.bom.filter(x=>x.pid==='VAST-SW-1TB'),'required'),d.storage.capacityLicenses,label+' TB licenses');
    assert.equal(sum(d.bom.filter(x=>x.pid==='VAST-SW-1CPU-CORE'),'required'),d.storage.coreLicenses,label+' core licenses');
  }
  for(const row of d.bom){
    assert.ok(Number.isInteger(row.required)&&row.required>0,label+' required '+row.cat);
    assert.equal(row.required+row.spare,row.total,label+' spare conservation '+row.cat);
  }
  for(const row of r.physical){near(row.totalPowerW,row.qty*row.powerW,label+' row power '+row.name);near(row.totalWeightKg,row.qty*row.weightKg,label+' row weight '+row.name);}
}

test('full calculator reconciles backend, frontend, storage, OOB, racks and facility totals across profiles',t=>{
  let cases=0;
  for(const platform of profiles)for(const nodes of [1,3,70,130])for(const storageSpines of ['shared','dedicated']){
    const c=calculator(),r=c.run({platform,nodes,storageSpines,suMode:'off',coolingType:'liquid-lcc',sparePct:10});
    reconcile(r,`${platform}/${nodes}/${storageSpines}`);cases++;
    assert.equal(c.window.LAST_BACKEND_REGRESSION.pass,true);
    if(r.design.frontend.enabled)assert.ok(r.design.frontend.leaves>0);
    if(platform==='rubin-nvl72'&&nodes>=70)assert.equal(r.design.backend.portMapVerified,false);
  }
  t.diagnostic(`${cases} complete profile/scale/storage combinations`);
});

test('all feature-toggle combinations remove disabled frontend, VAST, OOB and management from final design',t=>{
  let cases=0;
  for(const platform of profiles)for(let mask=0;mask<16;mask++){
    const c=calculator(),features={frontendToggle:!!(mask&1),vastToggle:!!(mask&2),oobToggle:!!(mask&4),mgmtToggle:!!(mask&8)};
    const r=c.run({platform,nodes:3,suMode:'off'},features),d=r.design;
    reconcile(r,`${platform}/mask${mask}`);cases++;
    assert.equal(d.frontend.enabled,features.frontendToggle);
    assert.equal(d.storage.enabled,features.vastToggle);
    assert.equal(d.management.oobEnabled,features.oobToggle);
    assert.equal(d.management.enabled,features.mgmtToggle);
    if(!features.frontendToggle)assert.equal(d.frontend.leaves+d.frontend.spines,0);
    if(!features.vastToggle){assert.equal(d.storage.eboxes,0);assert.ok(!d.bom.some(x=>x.cat.startsWith('VAST')));}
    if(!features.mgmtToggle)assert.equal(d.facility.managementPowerKw,0);
    if(!features.oobToggle&&platform!=='gb300-nvl72')assert.ok(!d.bom.some(x=>x.cat.startsWith('OOB')));
  }
  t.diagnostic(`${cases} complete feature-toggle combinations`);
});

test('VAST capacity independently reconciles decimal PB, binary PiB, EC overhead and license quantities',()=>{
  const c=calculator();
  for(const [model,tb]of [['122',122.88],['244',245.76],['430',430.08]]){
    let previous=0;
    for(let n=12;n<=256;n++){
      const v=c.api.vastCapacity(n,model),strips=Math.min(146,2*n-8);
      const expected=n*tb*(strips/(strips+4))*.92*.99*.9977;
      near(v.rawTb,n*tb,'raw TB');near(v.usableTb,expected,'usable TB');
      near(v.usablePb,expected/1000,'decimal PB');near(v.usablePib,expected*1e12/(1024**5),'binary PiB');
      assert.ok(v.usableTb>=previous);previous=v.usableTb;
    }
    for(const target of [.1,1,5,10,25,50,100]){
      const n=c.api.vastQtyForTarget(target,model),v=c.api.vastCapacity(n,model);
      if(v.usablePb>=target&&n>12)assert.ok(c.api.vastCapacity(n-1,model).usablePb<target);
      if(v.usablePb<target)assert.equal(n,256);
    }
  }
});

test('full liquid-cooling calculations reconcile CDU load and enforce local thermal limits across PIDs',t=>{
  let cases=0;
  for(const platform of ['supermicro-b300','gb300-nvl72','rubin-nvl72','rubin-hgx','rubin-nvl8-rack'])for(const pid of Object.keys(calculator().api.CDU_SPECS))for(const nodes of [1,9,70]){
    const c=calculator(),r=c.run({platform,nodes,suMode:'off',coolingType:'liquid-lcc',includeCdu:true,cduPid:pid,rackPowerLimit:1000,rackWeightLimitKg:3000}),d=r.design,p=d.facility.cdu;
    reconcile(r,`${platform}/${pid}/${nodes}`);cases++;
    assert.ok(p.qty>0);
    if(p.placement==='in-row')assert.equal(p.qty,Math.max(1,Math.ceil(d.facility.computePowerKw/p.capacityKw)));
    else assert.equal(p.qty,r.racks.filter(x=>x.role.startsWith('Compute')).length);
    if(platform==='rubin-nvl72')assert.equal(p.coolingStatus,'REVIEW');
    else if(platform==='rubin-nvl8-rack'&&p.placement!=='in-row')assert.equal(p.coolingStatus,'FAIL');
    else assert.equal(p.coolingStatus,'PASS');
    if(p.powerW===null)assert.match(c.controls.get('facilityMetrics').innerHTML,/incomplete/);
    const order=d.bom.filter(x=>x.cat==='Liquid Cooling CDU');assert.equal(sum(order,'required'),p.qty);
    if(p.coolingStatus==='FAIL')assert.match(c.controls.get('rackWarnings').innerHTML,/including cooling/);
  }
  t.diagnostic(`${cases} complete cooling/profile/scale combinations`);
});

test('unachievable VAST targets fail visibly instead of silently returning undersized storage',()=>{
  for(const model of ['122','244','430']){
    const c=calculator(),d=c.run({vastMode:'target',targetPb:100,eboxModel:model}).design;
    assert.equal(d.storage.eboxes,256);assert.equal(d.storage.capacityTargetMet,false);
    assert.equal(d.layoutAudit.status,'FAIL');assert.match(c.controls.get('vastMetrics').innerHTML,/FAIL: Target/);
    assert.ok(d.layoutAudit.checks.some(x=>x.domain==='Storage capacity'&&x.status==='FAIL'));
    const ok=c.run({targetPb:1}).design;
    assert.equal(ok.storage.capacityTargetMet,true);assert.ok(ok.storage.usablePb>=1);
  }
});

test('GB300 dedicated storage uses GX2A 400G receiving optics and actual 64-port spine capacity',()=>{
  const c=calculator(),r=c.run({platform:'gb300-nvl72',nodes:70,suMode:'off',storageSpines:'dedicated',eboxQty:72});
  const d=r.design,spine=d.layoutAudit.checks.find(x=>x.domain==='Shared spine');
  assert.ok(d.storage.uplinks>128);assert.equal(spine.status,'FAIL');assert.match(spine.message,/\/ 128 across/);
  const optics=d.bom.filter(x=>x.cat==='VAST Uplink Optics');
  assert.equal(optics.length,1);assert.equal(optics[0].pid,'QDD-400G-DR4-S=');assert.equal(optics[0].required,d.storage.uplinks*2);
  assert.equal(d.frontend.leaves,c.api.gb300ConvergedDesign(70,2,4).leaves);
  assert.equal(d.frontend.spines,c.api.gb300ConvergedDesign(70,2,4).spines);
});

test('generic OOB complete designs match endpoint feedback and STP/100G aggregation boundaries',t=>{
  let cases=0;
  for(const nodes of [1,47,48,95,96,512,1024,2048])for(const oobFabricMode of ['stp1g','spine100g']){
    const c=calculator(),r=c.run({platform:'b300',nodes,suMode:'off',oobFabricMode,eboxQty:25}),d=r.design,m=d.management;
    reconcile(r,`OOB ${nodes}/${oobFabricMode}`);cases++;
    assert.ok(m.oobLeaves*48>=m.oobEndpoints);
    if(m.oobSpines){assert.equal(m.oobSpines,Math.ceil(m.oobLeaves/35)*2);assert.equal(m.upstreamLinks,m.oobSpines);}
    if(m.oobAggregators)assert.ok(Math.ceil(m.oobLeaves/(m.oobAggregators/2))+1<=48);
    const rows=d.bom.filter(x=>x.cat==='OOB Management Optics');
    if(oobFabricMode==='stp1g')assert.equal(rows.length,0);
    else assert.ok(rows.every(x=>x.pid==='QSFP-100G-DR-S='));
  }
  t.diagnostic(`${cases} complete OOB boundary cases`);
});
