const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {calculator}=require('./helpers/calculator');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const api=new Function(html.slice(html.indexOf('function dist'),html.indexOf('function add(cat'))+
  ';return {twoTierPortPlan,nvl72BackendDesign,gb300Scalability};')();

test('GB300 topology ceiling is the actual whole-rack solver boundary, not a rounded SU estimate',()=>{
  const d=api.nvl72BackendDesign('gb300-nvl72',104),s=api.gb300Scalability(d);
  assert.equal(s.topologyLimitRacksPerFabric,113);
  assert.equal(s.topologyLimitGpusPerFabric,8136);
  assert.equal(s.ciscoRaTwoTierLimitRacks,64);
  assert.ok(api.twoTierPortPlan(113*72,400,4));
  assert.equal(api.twoTierPortPlan(114*72,400,4),null);
  const atLimit=api.nvl72BackendDesign('gb300-nvl72',113);
  assert.equal(atLimit.fabricTier,'2-tier');
  assert.equal(atLimit.fabricRacks,113,'compact designs do not advertise an unsupported 114-rack reservation');
  assert.equal(atLimit.fabricGpus,8136);
  assert.equal(api.gb300Scalability(atLimit).status,'AT LIMIT');
  assert.equal(api.nvl72BackendDesign('gb300-nvl72',114).fabricTier,'3-tier');
});

test('installed 104-rack compact inventory fits 106 racks, while reaching 113 needs more leaves',()=>{
  const d=api.nvl72BackendDesign('gb300-nvl72',104),s=api.gb300Scalability(d);
  assert.equal(s.installedCapacityRacksPerFabric,106);
  assert.equal(s.installedHeadroomRacksPerFabric,2);
  const fit=api.twoTierPortPlan(106*72,400,4),next=api.twoTierPortPlan(107*72,400,4);
  assert.equal(fit.leaves,d.leavesPerPlane);
  assert.equal(fit.spines,d.spinesPerPlane);
  assert.ok(next.leaves>d.leavesPerPlane);
  assert.equal(d.totalLeaves+d.totalSpines+d.totalSuperspines,368);
});

test('RA limits distinguish the two-tier boundary, edge inventory and reserved core',()=>{
  const two=api.gb300Scalability(api.nvl72BackendDesign('gb300-nvl72',64,'cisco-cloud-ra'));
  assert.equal(two.topologyLimitRacksPerFabric,64);
  assert.equal(two.status,'AT LIMIT');
  const three=api.gb300Scalability(api.nvl72BackendDesign('gb300-nvl72',104,'cisco-cloud-ra'));
  assert.equal(three.installedCapacityRacksPerFabric,112);
  assert.equal(three.installedHeadroomRacksPerFabric,8);
  assert.equal(three.reservedCoreCapacityRacks,128);
  assert.equal(three.topologyLimitRacksPerFabric,1024);
  assert.match(three.growth,/32-rack SU-groups above 512/);
  assert.equal(api.gb300Scalability(api.nvl72BackendDesign('gb300-nvl72',130)).status,'EXCEEDED');
});

test('limits are per independent fabric and persist in live UI, QA and captured design state',()=>{
  const c=calculator(),d=c.run({platform:'gb300-nvl72',nodes:104,suMode:'off',gb300RaPolicy:'engineering'}).design;
  assert.equal(d.backend.scalability.installedHeadroomRacksPerFabric,2);
  assert.match(c.controls.get('backendScalability').innerHTML,/113/);
  assert.match(c.controls.get('backendScalability').innerHTML,/not capacity already purchased/);
  assert.equal(c.controls.get('backendScalability').style.display,'block');
  assert.ok(d.qa.some(q=>q.includes('SCALABILITY REVIEW')&&q.includes('ceiling 113 racks')));
  const independent=c.run({platform:'gb300-nvl72',nodes:104,suMode:'custom',suNodes:16,suFabric:'independent'}).design.backend.scalability;
  assert.equal(independent.independentFabrics,7);
  assert.equal(independent.deployedRacksPerFabric,16);
  assert.equal(independent.installedCapacityRacksPerFabric,16);
  assert.equal(independent.topologyLimitRacksPerFabric,113);
  c.run({platform:'b300',nodes:16});
  assert.equal(c.controls.get('backendScalability').style.display,'none');
  assert.equal(c.controls.get('backendScalability').innerHTML,'');
  assert.equal(c.window.DESIGN_STATE.backend.scalability,null);
});
