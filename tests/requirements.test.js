const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {calculator}=require('./helpers/calculator');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const key='cisco_sizer_se_requirements_db';
function fixture(){
  const store=new Map(),downloads=[];
  const localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
  const urls={createObjectURL:blob=>{downloads.push(blob);return 'blob:requirements';},revokeObjectURL(){}};
  const app=calculator({localStorage,URL:urls,createElement:()=>({click(){downloads.push(this);}})}),api=app.api;
  app.window.DESIGN_STATE={solution:{totalGpus:512},compute:{computePowerKw:100,serverNodeCount:64,modelKey:'b300',platform:'Cisco UCS C880A M8 / B300'},
    assumptions:{facility:{powerBasis:'max'}},facility:{totalPowerKw:500,rackCount:12,racks:[{powerKw:45,weightKg:1400,items:[{powerW:10000,weightKg:100}]}]},
    storage:{enabled:true,usablePb:5*1024**5/1e15}};
  app.set({'req-server-model':'b300'});
  const set=values=>app.set(Object.fromEntries(Object.entries(values).map(([k,v])=>['req-'+k,v])));
  const importFile=payload=>api.handleFileImport({target:{value:'profile.json',files:[{size:100,text:async()=>typeof payload==='string'?payload:JSON.stringify(payload)}]}});
  return {...app,api,store,downloads,localStorage,setRequirements:set,importFile};
}

test('requirements match exact thresholds, with correct PiB conversion and margin signs',()=>{
  const f=fixture(),r=f.api.runComplianceAudit();
  assert.equal(r.breached,0);assert.equal(r.review,0);
  assert.ok(r.rows.every(r=>r.status==='PASS'));
  assert.equal(f.controls.get('compliance-overall-badge').textContent,'100% COMPLIANT');
  f.setRequirements({'target-nodes':65,'max-rack-kw':44.5,'max-facility-kw':499,'max-weight-kg':1390,'target-storage-pib':5.1,'max-racks':11});
  const failed=f.api.runComplianceAudit();
  assert.equal(failed.breached,6);
  assert.ok(failed.rows.filter(r=>!r.model).every(r=>r.margin<0&&r.status==='EXCEEDED'));
  assert.match(f.controls.get('compliance-overall-badge').textContent,/6 CONSTRAINTS BREACHED/);
});

test('blank and zero-storage thresholds are optional; invalid inputs and missing metrics require review',()=>{
  const f=fixture();
  f.setRequirements({'target-storage-pib':0,'target-nodes':'','max-racks':-1});
  let r=f.api.runComplianceAudit();
  assert.equal(r.rows[0].status,'NOT REQUESTED');assert.equal(r.rows[4].status,'NOT REQUESTED');
  assert.equal(r.rows[5].status,'REVIEW');
  f.setRequirements({'max-racks':1.5});assert.equal(f.api.runComplianceAudit().rows[5].status,'REVIEW');
  f.setRequirements({'max-racks':'Infinity'});assert.equal(f.api.runComplianceAudit().rows[5].status,'REVIEW');
  f.setRequirements({'max-racks':''});f.controls.get('req-max-racks').validity={badInput:true};
  assert.equal(f.api.runComplianceAudit().rows[5].status,'REVIEW','invalid browser number input is not an optional blank');
  f.window.DESIGN_STATE=null;
  assert.ok(f.api.runComplianceAudit().review>0);
  assert.doesNotMatch(f.controls.get('compliance-overall-badge').textContent,/100% COMPLIANT/);
});

test('disabled VAST fails a positive storage target and unknown physical data cannot pass',()=>{
  const f=fixture();f.window.DESIGN_STATE.storage.enabled=false;
  assert.equal(f.api.runComplianceAudit().rows[4].status,'EXCEEDED');
  f.window.LAST_PHYS_ROWS=[{powerKnown:false,weightKnown:false}];
  let r=f.api.runComplianceAudit();
  assert.equal(r.rows[1].status,'REVIEW');assert.equal(r.rows[2].status,'REVIEW');assert.equal(r.rows[3].status,'REVIEW');
  f.setRequirements({'max-rack-kw':40});
  assert.equal(f.api.runComplianceAudit().rows[1].status,'EXCEEDED','known lower bound already breaches cap');
  f.window.LAST_PHYS_ROWS=[];
  f.window.DESIGN_STATE.assumptions.facility.powerBasis='typical';
  assert.equal(f.api.runComplianceAudit().rows[2].status,'REVIEW');
});

test('real calc refreshes scorecard after sizing and threshold changes without changing sizing math',()=>{
  const f=calculator();
  const first=f.run({platform:'b300',nodes:16}).design;
  assert.match(f.controls.get('compliance-matrix-rows').innerHTML,/16 nodes/);
  assert.match(f.controls.get('compliance-overall-badge').textContent,/BREACHED/);
  f.set({'req-target-nodes':16,'req-target-storage-pib':0,'req-max-rack-kw':'','req-max-facility-kw':'','req-max-weight-kg':'','req-max-racks':''});
  f.api.calc();
  assert.equal(f.controls.get('compliance-overall-badge').textContent,'100% COMPLIANT');
  assert.deepEqual(f.window.DESIGN_STATE.backend,first.backend);
  f.run({nodes:8});
  assert.match(f.controls.get('compliance-matrix-rows').innerHTML,/8 nodes/);
  assert.match(f.controls.get('compliance-overall-badge').textContent,/1 CONSTRAINT BREACHED/);
});

test('profile save and load roundtrip by Customer (DealID), replacing only matching identities',()=>{
  const f=fixture();f.setRequirements({customer:'Demo Account','deal-id':'OPP-1'});
  f.run({platform:'b300',nodes:64});
  const before=JSON.stringify(f.window.DESIGN_STATE),id=f.api.saveCurrentRequirements();
  assert.equal(id,'Demo Account (OPP-1)');
  f.setRequirements({'target-nodes':1024});f.api.saveCurrentRequirements();
  assert.equal(Object.keys(JSON.parse(f.store.get(key))).length,1);
  f.setRequirements({'deal-id':'OPP-2'});f.api.saveCurrentRequirements();
  f.api.loadRequirementProfile(id);
  assert.equal(f.controls.get('req-deal-id').value,'OPP-1');
  assert.equal(f.controls.get('req-target-nodes').value,'1024');
  assert.equal(JSON.stringify(f.window.DESIGN_STATE),before);
  assert.equal(Object.keys(JSON.parse(f.store.get(key))).length,2);
});

test('profile export/import merges atomically and restores all fields after reload',async()=>{
  const f=fixture();f.setRequirements({customer:'Demo','deal-id':'A'});const id=f.api.saveCurrentRequirements();
  f.api.exportRequirementsJSON();
  const payload=JSON.parse(await f.downloads[0].text());
  assert.equal(payload.schemaVersion,3);assert.equal(f.downloads[1].download,'Cisco_Sizer_SE_Requirements.json');
  const other=fixture();other.setRequirements({customer:'Existing','deal-id':'B'});other.api.saveCurrentRequirements();
  assert.equal(await other.importFile(payload),true);
  assert.equal(Object.keys(JSON.parse(other.store.get(key))).length,2);
  other.api.loadRequirementProfile(id);
  assert.deepEqual(other.api.currentRequirements(),f.api.currentRequirements());
  const before=other.store.get(key);
  const bad=JSON.parse(JSON.stringify(payload));bad.profiles[id]['max-racks']=-1;
  assert.equal(await other.importFile(bad),false);assert.equal(other.store.get(key),before);
  bad.profiles[id]['max-racks']='0x10';
  assert.equal(await other.importFile(bad),false,'reject numeric strings that HTML number inputs would silently clear');
  assert.equal(other.store.get(key),before);
  assert.equal(await other.importFile('{invalid json'),false);assert.equal(other.store.get(key),before);
  assert.equal(await other.importFile({schemaVersion:4,profiles:{}}),false);
  assert.equal(await other.importFile({schemaVersion:1,profiles:[]}),false);
  assert.equal(await other.importFile({schemaVersion:1,profiles:{wrong:payload.profiles[id]}}),false);
});

test('corrupt/unavailable storage reports errors without overwriting profiles or breaking audit',()=>{
  const f=fixture();f.setRequirements({customer:'Demo'});f.store.set(key,'broken');
  assert.equal(f.api.saveCurrentRequirements(),null);assert.equal(f.store.get(key),'broken');
  assert.equal(f.api.refreshSavedProfilesDropdown(),null);
  assert.match(f.controls.get('req-profile-message').textContent,/Unable/);
  f.localStorage.getItem=()=>{throw Error('Storage blocked');};
  assert.doesNotThrow(()=>f.api.loadRequirementProfile('Demo ()'));
  assert.equal(f.api.saveCurrentRequirements(),null);
  assert.doesNotThrow(()=>f.api.runComplianceAudit());
});

test('profile names are escaped in dropdown options and imports do not permit prototype keys',async()=>{
  const f=fixture();f.setRequirements({customer:'<img src=x onerror=alert(1)>','deal-id':'"Deal"'});
  f.api.saveCurrentRequirements();
  const markup=f.controls.get('req-saved-profiles').innerHTML;
  assert.doesNotMatch(markup,/<img/);assert.match(markup,/&lt;img/);assert.match(markup,/&quot;/);
  assert.equal(await f.importFile('{"__proto__":{"polluted":true}}'),false);
  assert.equal({}.polluted,undefined);
});

test('requirements column remains outside result tabs and preserves input event bindings',()=>{
  for(const id of ['summary','topology','ports','phases','bom','qa','facilities','racks'])assert.match(html,new RegExp('id="'+id+'" class="panel'));
  assert.match(html,/<aside id="requirements-column"[^>]*>\s*<div id="tab-requirements" class="card summary"/);
  assert.doesNotMatch(html,/showTab\('requirements'/);
  assert.doesNotMatch(html,/id="tab-requirements" class="[^"]*\bpanel\b/);
  const inputs=[...html.matchAll(/<input\b[^>]*id="req-(?!file-input)[^"]+"[^>]*>/g)];
  assert.equal(inputs.length,8);
  assert.ok(inputs.every(m=>m[0].includes('oninput="runComplianceAudit()"')));
  const panels=['summary','topology','ports','phases','bom','qa','facilities','racks'].map(id=>({id,classes:new Set(id==='summary'?['active']:[])}));
  const buttons=panels.map(()=>({classes:new Set()}));
  for(const el of [...panels,...buttons])el.classList={add:c=>el.classes.add(c),remove:c=>el.classes.delete(c)};
  const fn=html.match(/function showTab\(id,btn\)\{[^\n]+/)[0];
  const show=new Function('$','document',fn+';return showTab;')(id=>panels.find(p=>p.id===id),{querySelectorAll:selector=>selector==='.panel'?panels:buttons});
  show('bom',buttons[4]);
  assert.deepEqual(panels.filter(p=>p.classes.has('active')).map(p=>p.id),['bom']);
  show('summary',buttons[0]);
  assert.deepEqual(panels.filter(p=>p.classes.has('active')).map(p=>p.id),['summary']);
  assert.equal(buttons[4].classes.has('active'),false);
});

test('server model mismatch fails independently of sufficient compute node count',()=>{
  const f=fixture();
  f.setRequirements({'server-model':'h200'});
  let r=f.api.runComplianceAudit();
  assert.equal(r.rows[0].status,'PASS');
  assert.equal(r.rows[6].status,'EXCEEDED');
  assert.equal(r.breached,1);
  assert.match(f.controls.get('compliance-matrix-rows').innerHTML,/Model mismatch/);
  f.window.DESIGN_STATE.compute.modelKey='h200';
  assert.equal(f.api.runComplianceAudit().rows[6].status,'PASS');
  f.setRequirements({'server-model':''});
  assert.equal(f.api.runComplianceAudit().rows[6].status,'NOT REQUESTED');
  f.setRequirements({'target-nodes':1.5});
  assert.equal(f.api.runComplianceAudit().rows[0].status,'REVIEW');
});

test('rack-scale compute counts enclosed servers/trays, not rack units or GPUs',()=>{
  // Modular inputs round from three requested to four deployed nodes under
  // the default scale-unit policy; audit the deployed count.
  for(const [platform,count] of [['gb300-nvl72',54],['rubin-nvl72',54],['rubin-nvl8-rack',27],['rubin-hgx',4],['b300',4]]){
    const f=calculator();
    const d=f.run({platform,nodes:3}).design;
    assert.equal(d.compute.serverNodeCount,count,platform);
    f.set({'req-target-nodes':count,'req-server-model':platform});
    f.api.calc();
    const matrix=f.controls.get('compliance-matrix-rows').innerHTML;
    assert.match(matrix,new RegExp(count+' nodes'));
    assert.match(matrix,/Model matches/);
  }
});

test('legacy GPU-only profiles preserve other limits without assuming node density',async()=>{
  const f=fixture();f.setRequirements({customer:'Legacy Demo','deal-id':'OLD'});
  const legacy=f.api.currentRequirements();
  delete legacy['target-nodes'];delete legacy['server-model'];legacy['target-gpus']='512';
  const id='Legacy Demo (OLD)';
  assert.equal(await f.importFile({schemaVersion:1,profiles:{[id]:legacy}}),true);
  f.api.loadRequirementProfile(id);
  assert.equal(f.controls.get('req-target-nodes').value,'');
  assert.equal(f.controls.get('req-server-model').value,'');
  assert.equal(f.controls.get('req-max-rack-kw').value,'45');
  assert.match(f.controls.get('req-profile-message').textContent,/legacy GPU targets are not converted/);
  f.setRequirements({'target-nodes':64,'server-model':'h200'});
  f.api.saveCurrentRequirements();f.api.loadRequirementProfile(id);
  assert.equal(f.controls.get('req-target-nodes').value,'64');
  assert.equal(f.controls.get('req-server-model').value,'h200');
  assert.equal(JSON.parse(f.store.get(key))[id]['target-gpus'],undefined);
});

test('deal profiles restore sizing inputs, feature toggles and calculated outputs across platforms',()=>{
  const configurations=[
    {platform:'b300',nodes:32,customNicProfile:'cx7',backendOptic:'OSFP-800G-DR8'},
    {platform:'amd-mi355x',nodes:40,amdNicsPerServer:7,amdFabricPlanes:2,amdNicSpeed:200,suMode:'off',sparePct:5,rackPowerLimit:70},
    {platform:'supermicro-b300',coolingType:'liquid-lcc',supermicroPid:'SYS422GSNB3RTLCC2',nodes:12,includeCdu:true,cduPid:'LCS-SCDU-250LP4002',rackWeightLimitKg:2000},
    {platform:'gb300-nvl72',nodes:3,rackScalePid:'SRS-GB300-NVL72-M1',gb300OobMode:'spine',feOver:3},
    {platform:'rubin-hgx',nodes:12,rackScalePid:'SYS222GS-R2BTALC2',rubinNicMode:'sp_dp',rubinPowerKw:28},
    {platform:'rubin-nvl8-rack',nodes:3,rackScalePid:'SRS-RUBIN-NVL8-M1',rubinPowerKw:25,includeCdu:true},
    {platform:'custom',nodes:32,customServerName:'Demo Custom Server',customNicProfile:'custom',customNicSpeed:400,customNicPortMode:'sp_sp',customGpusPerNode:4,suMode:'custom',suNodes:8},
    {platform:'h200',nodes:32,sizingBasis:'power',computePowerBudgetKw:750,computePowerBasis:'max',vastMode:'target',targetPb:3,drr:3}
  ];
  for(const config of configurations){
    const f=fixture();f.setRequirements({customer:'Demo '+config.platform,'deal-id':'SNAP'});
    f.run(config,{frontendToggle:true,mgmtToggle:false,vastToggle:true,oobToggle:false});
    f.set({customerName:'Demo export customer'});
    const expected=f.window.DESIGN_STATE,snapshot=f.api.captureSizingInputs();
    const id=f.api.saveCurrentRequirements();assert.ok(id,config.platform);
    f.run({platform:'b300',nodes:8},{frontendToggle:false,mgmtToggle:true,vastToggle:false,oobToggle:true});
    f.api.loadRequirementProfile(id);
    assert.match(f.controls.get('req-profile-message').textContent,/Restored sizing inputs and recalculated/,config.platform);
    const actual=f.api.captureSizingInputs();
    for(const [input,value]of Object.entries(snapshot.inputs)){
      // Empty/inactive platform-specific menus are rebuilt for the active model.
      if(['supermicroPid','rackScalePid','ccwComputeAto'].includes(input)&&!value)continue;
      assert.equal(actual.inputs[input],value,config.platform+': '+input);
    }
    assert.deepEqual(actual.features,snapshot.features,config.platform);
    assert.deepEqual(f.window.DESIGN_STATE.backend,expected.backend,config.platform);
    assert.deepEqual(f.window.DESIGN_STATE.solution,expected.solution,config.platform);
    assert.equal(f.window.CURRENT_CUSTOMER_NAME,'Demo export customer');
  }
});

test('sizing snapshot JSON export/import restores a design in a fresh session',async()=>{
  const f=fixture();f.setRequirements({customer:'Fresh Session','deal-id':'FULL'});
  f.run({platform:'gb300-nvl72',nodes:5,rackScalePid:'SRS-GB300-NVL72-M1'});
  const id=f.api.saveCurrentRequirements();f.api.exportRequirementsJSON();
  const payload=JSON.parse(await f.downloads[0].text());
  const fresh=fixture();assert.equal(await fresh.importFile(payload),true);
  fresh.api.loadRequirementProfile(id);
  assert.equal(fresh.controls.get('platform').value,'gb300-nvl72');
  assert.equal(fresh.controls.get('nodes').value,'5');
  assert.equal(fresh.controls.get('rackScalePid').value,'SRS-GB300-NVL72-M1');
  assert.deepEqual(fresh.window.DESIGN_STATE.solution,f.window.DESIGN_STATE.solution);
});

test('invalid snapshots cannot corrupt the database and failed loads restore current inputs',async()=>{
  const f=fixture();f.setRequirements({customer:'Atomic Demo'});f.run({platform:'b300',nodes:32});
  const id=f.api.saveCurrentRequirements(),original=f.store.get(key),profile=JSON.parse(original)[id];
  profile.sizing.inputs.includeCdu='yes';
  assert.equal(await f.importFile({schemaVersion:3,profiles:{[id]:profile}}),false);
  assert.equal(f.store.get(key),original);
  profile.sizing.inputs.includeCdu=false;profile.sizing.inputs.notAControl='injected';
  assert.equal(await f.importFile({schemaVersion:3,profiles:{[id]:profile}}),false);
  assert.equal(f.store.get(key),original);
  delete profile.sizing.inputs.notAControl;profile.sizing.inputs.backendSwitch='UNAVAILABLE-SWITCH';
  f.store.set(key,JSON.stringify({[id]:profile}));
  f.run({platform:'h200',nodes:16});
  const before=f.api.captureSizingInputs(),solution=f.window.DESIGN_STATE.solution;
  f.api.loadRequirementProfile(id);
  assert.match(f.controls.get('req-profile-message').textContent,/Unable to load profile/);
  assert.deepEqual(f.api.captureSizingInputs(),before);
  assert.deepEqual(f.window.DESIGN_STATE.solution,solution);
});
