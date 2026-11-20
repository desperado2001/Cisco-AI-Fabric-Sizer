const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {calculator}=require('./helpers/calculator');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');

const RUBIN=['rubin-nvl72','rubin-hgx','rubin-nvl8-rack'];
const OTHERS=['b300','supermicro-b300','gb300-nvl72','amd-mi355x','h200'];

test('Vera Rubin platforms carry the initial-plan notice in the UI, QA and design state',()=>{
  for(const platform of RUBIN){
    const c=calculator(),d=c.run({platform,nodes:4,suMode:'off'}).design;
    assert.equal(d.planStatus.initialPlan,true,platform);
    assert.match(d.planStatus.label,/INITIAL PLAN - SUBJECT TO CHANGE/);
    assert.match(d.planStatus.notice,/may change/);
    assert.match(d.qa[0],/INITIAL PLAN - SUBJECT TO CHANGE/,platform);
    const banner=c.controls.get('rubinPlanNotice');
    assert.equal(banner.style.display,'',platform);
    assert.match(banner.innerHTML,/subject to change|SUBJECT TO CHANGE/);
  }
});

test('Non-Rubin platforms do not show the initial-plan notice',()=>{
  for(const platform of OTHERS){
    const c=calculator(),d=c.run({platform,nodes:4,suMode:'off'}).design;
    assert.equal(d.planStatus.initialPlan,false,platform);
    assert.ok(!d.qa.some(x=>/INITIAL PLAN/.test(x)),platform);
    assert.equal(c.controls.get('rubinPlanNotice').style.display,'none',platform);
  }
});

test('Switching away from Rubin hides the banner again',()=>{
  const c=calculator();
  c.run({platform:'rubin-nvl72',nodes:2,suMode:'off'});
  assert.equal(c.controls.get('rubinPlanNotice').style.display,'');
  const d=c.run({platform:'gb300-nvl72',nodes:2,suMode:'off'}).design;
  assert.equal(c.controls.get('rubinPlanNotice').style.display,'none');
  assert.equal(d.planStatus.initialPlan,false);
});

const runCsv=planStatus=>{
  const start=html.indexOf('function exportCsv(){');
  const source=html.slice(start,start+html.slice(start).search(/try\{\r?\n  const savedCustomer/));
  let csv='';
  const window={DESIGN_STATE:{planStatus},LAST_PHYS_ROWS:[],LAST_RACKS:[]};
  const Blob=function(parts){csv=parts.join('');};
  const URL={createObjectURL:()=>'',revokeObjectURL:()=>{}};
  const document={createElement:()=>({click(){}})};
  new Function('window','Blob','URL','document','BOM','customerFilePrefix',source+';exportCsv();')(window,Blob,URL,document,[],()=> '');
  return csv;
};

test('Engineering CSV leads with the plan status only for Rubin designs',()=>{
  const rubin=runCsv({initialPlan:true,label:'INITIAL PLAN - SUBJECT TO CHANGE',notice:'Vera Rubin sizing may change.'});
  assert.match(rubin.split('\n')[0],/^Plan Status,"INITIAL PLAN - SUBJECT TO CHANGE"/);
  assert.match(rubin,/\nLine,Category,PID/);
  const other=runCsv({initialPlan:false});
  assert.match(other,/^Line,Category,PID/);
});

test('Vera Rubin backends require 102.4T switching: Spectrum-6 default, G300 optional, no 51.2T',()=>{
  for(const platform of RUBIN){
    const c=calculator(),d=c.run({platform,nodes:8,suMode:'off'}).design;
    assert.equal(d.backend.switchPid,'N9164F-NS6-ML',platform);
    assert.equal(d.backend.switchCapacityTbps,102.4,platform);
    assert.equal(d.backend.spectrum6Backend,true,platform);
    const opts=c.controls.get('backendSwitch').options;
    for(const o of opts)assert.equal(!!o.disabled,!['N9164F-NS6-ML','N9364F-SG3-A'].includes(o.value),platform+' '+o.value);
    const g=c.run({backendSwitch:'N9364F-SG3-A'}).design;
    assert.equal(g.backend.switchPid,'N9364F-SG3-A',platform);
    // A 51.2T switch restored from an older saved profile moves to Spectrum-6.
    const old=c.run({backendSwitch:'N9164E-NS4-O'}).design;
    assert.equal(old.backend.switchPid,'N9164F-NS6-ML',platform);
  }
});

test('Non-Rubin platforms keep 51.2T switching and cannot select the Rubin 102.4T switches',()=>{
  const c=calculator();
  c.run({platform:'rubin-nvl72',nodes:8,suMode:'off'});
  const d=c.run({platform:'gb300-nvl72',nodes:8,suMode:'off'}).design;
  assert.equal(d.backend.switchPid,'N9164E-NS4-O');
  const opts=c.controls.get('backendSwitch').options;
  assert.ok(opts.find(o=>o.value==='N9164F-NS6-ML').disabled);
  assert.ok(opts.find(o=>o.value==='N9364F-SG3-A').disabled);
});

test('Two-plane 102.4T Vera Rubin NVL72 stays two-tier through 113 racks and flags a third tier at 114',()=>{
  const at=calculator().run({platform:'rubin-nvl72',nodes:113,suMode:'off'}).design.backend;
  const over=calculator().run({platform:'rubin-nvl72',nodes:114,suMode:'off'}).design.backend;
  assert.equal(at.fabricTier,'2-tier');
  assert.equal(over.fabricTier,'3-tier review');
  assert.equal(at.twoTierGpuCeiling,8192);
});
