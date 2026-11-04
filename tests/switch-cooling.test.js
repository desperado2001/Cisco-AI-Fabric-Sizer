const test=require('node:test');
const assert=require('node:assert/strict');
const {calculator}=require('./helpers/calculator');

test('N9164 liquid reference separates the exact MGX model from its family and air-cooled sizing',()=>{
  const c=calculator(),d=c.run({platform:'gb300-nvl72',nodes:104,suMode:'off'}).design;
  const p=d.backend.coolingQualification;
  assert.equal(p.referencePid,'N9164F-NS6-ML');
  assert.equal(p.familyPid,'N9164F-NS6');
  assert.equal(p.required,false);
  assert.equal(p.appliedToSizing,false);
  assert.equal(p.powerW,null);assert.equal(p.weightKg,null);assert.equal(p.coolantFlowLpm,null);
  assert.match(c.controls.get('backendCoolingNote').innerHTML,/N9164F-NS6-ML/);
  assert.match(c.controls.get('backendCoolingNote').innerHTML,/not two switches or add-on kits/);
  assert.ok(!d.bom.some(r=>r.pid==='N9164F-NS6-ML'||r.pid==='N9164F-NS6'));
});

test('liquid target cannot reuse NS4 sizing as a qualified liquid BOM or silently change facilities',()=>{
  for(const platform of ['gb300-nvl72','rubin-nvl72','b300','amd-mi355x']){
    const c=calculator(),base=c.run({platform,nodes:104,suMode:'off',backendCoolingOption:'modeled'}).design;
    const d=c.run({backendCoolingOption:'N9164F-NS6-ML'}).design;
    assert.equal(d.backend.coolingQualification.required,true);
    assert.equal(d.backend.coolingQualification.targetPid,'N9164F-NS6-ML');
    assert.equal(d.backend.coolingQualification.status,'FAIL');
    assert.equal(d.backend.switchPid,base.backend.switchPid);
    assert.equal(d.solution.backendSwitches,base.solution.backendSwitches);
    assert.equal(d.facility.totalPowerKw,base.facility.totalPowerKw);
    assert.equal(d.facility.totalWeightKg,base.facility.totalWeightKg);
    assert.equal(d.layoutAudit.status,'FAIL');
    assert.ok(d.layoutAudit.checks.some(c=>c.domain==='Backend liquid cooling'&&c.status==='FAIL'));
    assert.match(c.controls.get('summary').innerHTML,/Liquid-cooled backend requirement UNMET/);
    assert.ok(d.bom.filter(r=>/^AI Backend/.test(r.cat)).every(r=>r.status.includes('LIQUID COOLING REQUIREMENT UNMET')&&r.basis.includes('Target N9164F-NS6-ML')));
    assert.ok(!d.bom.some(r=>r.pid==='N9164F-NS6-ML'));
    assert.ok(c.api.runComplianceAudit().rows.some(r=>r.key==='backend-liquid-cooling'&&r.status==='EXCEEDED'));
    const restored=c.run({backendCoolingOption:'modeled'}).design;
    assert.equal(restored.backend.coolingQualification.required,false);
    assert.ok(!restored.layoutAudit.checks.some(c=>c.domain==='Backend liquid cooling'));
  }
});

test('RA-required mode cannot approve an unqualified liquid-cooled platform replacement',()=>{
  const d=calculator().run({platform:'gb300-nvl72',nodes:104,suMode:'off',gb300RaPolicy:'cisco-cloud-ra',backendCoolingOption:'N9164F-NS6-ML'}).design;
  assert.equal(d.solution.backendSwitches,928);
  assert.equal(d.backend.switchPid,'N9164E-NS4-O');
  assert.equal(d.layoutAudit.status,'FAIL');
  assert.ok(d.qa.some(q=>q.includes('LIQUID COOLING FAIL')));
});

test('saved profiles preserve cooling requirement and older snapshots default to the current modeled switch',()=>{
  const store=new Map(),c=calculator({localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)}});
  c.run({platform:'gb300-nvl72',nodes:104,suMode:'off',backendCoolingOption:'N9164F-NS6-ML','req-customer':'Liquid client','req-deal-id':'LC-1'});
  const key=c.api.saveCurrentRequirements();assert.ok(key);
  c.run({backendCoolingOption:'modeled'});c.api.loadRequirementProfile(key);
  assert.equal(c.window.DESIGN_STATE.backend.coolingQualification.required,true);
  const db=JSON.parse(store.get('cisco_sizer_se_requirements_db'));
  delete db[key].sizing.inputs.backendCoolingOption;
  store.set('cisco_sizer_se_requirements_db',JSON.stringify(db));
  c.api.loadRequirementProfile(key);
  assert.equal(c.window.DESIGN_STATE.backend.coolingQualification.required,false);
});
