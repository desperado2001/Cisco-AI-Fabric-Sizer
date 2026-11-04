const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {calculator}=require('./helpers/calculator');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const api=new Function(html.slice(html.indexOf('function dist'),html.indexOf('function add(cat'))+
  ';return {nvl72BackendDesign,rubinG300BackendDesign,backendDesign,backendPortConsumption};')();
const g300=racks=>api.rubinG300BackendDesign(api.nvl72BackendDesign('rubin-nvl72',racks));

test('G300 uses native 102.4T radix and 1.6T cages instead of relabeling the 51.2T model',()=>{
  const base=api.nvl72BackendDesign('rubin-nvl72',8),d=g300(8),p=api.backendPortConsumption(d);
  assert.deepEqual([base.totalLeaves,base.totalSpines],[40,20]);
  assert.deepEqual([d.totalLeaves,d.totalSpines],[24,10]);
  assert.equal(d.switchCapacityGbps,102400);
  assert.equal(p.cageSpeedG,1600);
  assert.equal(d.speed,800);
  assert.equal(d.hostOptics,8*144);
  assert.equal(d.physicalHostLinks,8*144);
  assert.equal(d.switchHostOptics,8*72);
  assert.equal(d.ciscoCx8DualRA,false);
  assert.equal(d.twoTierGpuCeiling,8192);
});

test('G300 NVL72 sweep conserves rails, logical bandwidth, optic cages and whole peer links',()=>{
  for(let racks=1;racks<=130;racks++){
    const d=g300(racks),p=api.backendPortConsumption(d);
    assert.equal(d.hostLinkDist.reduce((a,b)=>a+b,0),racks*72);
    assert.equal(d.railMappingVerified,true);
    assert.equal(d.switchHostOptics,d.hostCageDist.reduce((a,b)=>a+b,0)*2);
    assert.equal(d.leafSpineOptics,2*d.physicalLeafSpineLinks);
    assert.equal(d.logicalLeafSpineLinks,2*d.physicalLeafSpineLinks);
    d.hostLinkDist.forEach((n,i)=>{
      assert.ok(d.hostCageDist[i]+d.uplinkDist[i]<=64);
      assert.ok(d.uplinkDist[i]*1600>=n*800);
    });
    if(d.portMapVerified){
      assert.ok(Number.isInteger(d.meshLinksPerPair));
      assert.equal(d.uplinkDist[0]*2,d.spinesPerPlane*d.meshLinksPerPair);
      assert.equal(p.spines.downCages*d.totalSpines,d.physicalLeafSpineLinks);
      assert.ok(p.spines.usedCages<=64);
    }
  }
  assert.equal(g300(113).portMapVerified,true);
  assert.equal(g300(114).portMapVerified,false);
  assert.equal(g300(114).fabricTier,'3-tier review');
});

test('G300 full calculator preserves unknown physical values and replaces inherited switch optics/cables',()=>{
  for(const platform of ['rubin-nvl72','rubin-hgx','rubin-nvl8-rack']){
    const c=calculator(),r=c.run({platform,nodes:8,suMode:'off',backendSwitch:'N9364F-SG3-A'}),d=r.design;
    assert.equal(d.backend.switchAsic,'Cisco Silicon One G300');
    assert.equal(d.backend.switchCapacityTbps,102.4);
    assert.equal(d.backend.cageSpeedG,1600);
    assert.equal(d.backend.switchOptic,'TBD-1600G-G300-SWITCH');
    assert.ok(d.bom.filter(r=>['AI Backend Leaf','AI Backend Spine'].includes(r.cat)).every(r=>r.pid==='N9364F-SG3-A'&&!r.status.includes('51.2T')));
    assert.ok(d.bom.filter(r=>r.cat==='AI Backend Optics').every(r=>r.pid==='TBD-1600G-G300-SWITCH'&&r.desc.includes('1.6T')));
    assert.ok(!d.bom.some(r=>r.cat==='AI Backend Cabling'&&r.pid==='CB-M12-M12-SMF'));
    const lot=d.bom.find(r=>r.pid==='TBD-G300-CABLING');assert.equal(lot.required,1);assert.equal(lot.spare,0);assert.match(lot.desc,/counts\/PIDs TBD/);
    assert.ok(r.physical.filter(r=>r.name.includes('SG3')).every(r=>r.powerKnown===false&&r.weightKnown===false));
    assert.match(c.controls.get('facilitySummary').innerHTML,/INCOMPLETE/);
    assert.match(c.controls.get('ports').innerHTML,/64 physical 1600G ports/);
    assert.match(c.controls.get('topology').innerHTML,/1600G equivalent cages/);
    assert.ok(d.layoutAudit.checks.some(c=>c.domain==='G300 physical and optical qualification'&&c.status==='REVIEW'));
    assert.equal(c.window.LAST_BACKEND_REGRESSION.pass,true);
  }
});

test('Rubin NVL8 eight-rail distributions and independent fabric quantities conserve every connection',()=>{
  for(const mode of ['sp_sp','sp_dp','dp_dp'])for(const n of [1,17,129,130,300]){
    const seed=api.backendDesign(n,'custom','rail',8,{nicProfile:'cx9-rubin',portMode:mode,planes:mode==='sp_sp'?1:2,hostInterfaceSpeed:800,linkSpeed:400,linksPerGpu:mode==='sp_sp'?1:2,physicalPortsPerGpu:mode==='dp_dp'?2:1});
    const d=api.rubinG300BackendDesign(seed),perRail=d.leavesPerPlane/8;
    assert.equal(d.railMappingVerified,true);
    for(let rail=0;rail<8;rail++)assert.equal(d.hostLinkDist.slice(rail*perRail,(rail+1)*perRail).reduce((a,b)=>a+b,0),d.linksPerPlane/8);
  }
  const c=calculator(),d=c.run({platform:'rubin-nvl72',nodes:16,suMode:'custom',suNodes:8,suFabric:'independent',backendSwitch:'N9364F-SG3-A'}).design;
  assert.equal(d.backend.totalLeaves,g300(8).totalLeaves*2);
  assert.equal(d.backend.totalSpines,g300(8).totalSpines*2);
  assert.equal(d.backend.portConsumption.independentFabrics,2);
});

test('G300 and liquid ORv3 selections survive profile restoration without changing other-platform defaults',()=>{
  const store=new Map(),c=calculator({localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)}});
  c.run({platform:'rubin-nvl72',nodes:8,suMode:'off',backendSwitch:'N9364F-SG3-A',backendCoolingOption:'N9364F-SG3-RL','req-customer':'Rubin G300','req-deal-id':'G300-1'});
  assert.equal(c.window.DESIGN_STATE.backend.coolingQualification.targetPid,'N9364F-SG3-RL');
  assert.match(c.controls.get('summary').innerHTML,/N9364F-SG3-RL is a procurement target/);
  const key=c.api.saveCurrentRequirements();assert.ok(key);
  const other=c.run({platform:'gb300-nvl72',nodes:8,backendCoolingOption:'modeled'}).design;
  assert.equal(other.backend.switchPid,'N9164E-NS4-O');
  assert.equal(other.backend.g300Planning,false);
  c.api.loadRequirementProfile(key);
  assert.equal(c.window.DESIGN_STATE.backend.switchPid,'N9364F-SG3-A');
  assert.equal(c.window.DESIGN_STATE.backend.coolingQualification.targetPid,'N9364F-SG3-RL');
});
