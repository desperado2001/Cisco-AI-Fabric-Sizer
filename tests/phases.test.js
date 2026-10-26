const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const source=html.slice(html.indexOf('function projectPhaseLines'),html.indexOf('function phaseEscape'));
const {buildProjectPhasePlan,projectPhaseLines}=new Function(source+';return {buildProjectPhasePlan,projectPhaseLines};')();
function phase(gpus,qty,pid='SW',customer='Demo'){
  return {name:'Phase '+gpus,capturedAt:'2026-10-23T00:00:00Z',design:{customer,
    solution:{totalGpus:gpus},compute:{platform:'GB300'},backend:{planes:2,fabricTier:'2-tier',totalSuperspines:0},layoutAudit:{status:'REVIEW'},
    bom:[{cat:'AI Backend Leaf',pid,total:qty},{cat:'Software License',pid:'LICENSE',total:10}]}};
}
test('cumulative phases conserve inventory through additions, surplus and later reuse',()=>{
  const phases=[phase(72,10),phase(144,6),phase(216,12)];
  const original=JSON.stringify(phases),plan=buildProjectPhasePlan(phases);
  assert.deepEqual(plan.map(p=>{const r=p.comparison.find(r=>r.pid==='SW');return [r.available,r.reuse,r.additional,r.unassigned];}),[[0,0,10,0],[10,6,0,4],[10,10,2,0]]);
  assert.deepEqual(plan.map(p=>p.gpuAddition),[72,72,72]);
  assert.equal(JSON.stringify(phases),original);
  for(const p of plan){
    assert.equal(p.review,true);
    const license=p.comparison.find(r=>r.pid==='LICENSE');
    assert.equal(license.reuse,0);assert.equal(license.additional,10);
    for(const r of p.comparison){assert.equal(r.reuse+r.additional,r.quantity);assert.equal(r.reuse+r.unassigned,r.available);}
  }
});
test('PID changes retain old equipment and require architecture review when tiers change',()=>{
  const first=phase(72,8,'OLD'),second=phase(144,12,'NEW');
  second.design.backend.fabricTier='3-tier';second.design.backend.totalSuperspines=6;
  const p=buildProjectPhasePlan([first,second])[1];
  assert.equal(p.architectureChanged,true);
  assert.equal(p.comparison.find(r=>r.pid==='OLD').unassigned,8);
  assert.equal(p.comparison.find(r=>r.pid==='NEW').additional,12);
});
test('independent deployments never reuse inventory and allow decreasing capacity',()=>{
  const plan=buildProjectPhasePlan([phase(144,12),phase(72,8)],'independent');
  assert.equal(plan[1].comparison.find(r=>r.pid==='SW').additional,8);
  assert.ok(plan.every(p=>p.comparison.every(r=>r.available===0&&r.reuse===0)));
  assert.throws(()=>buildProjectPhasePlan([phase(144,12),phase(72,8)]),/increase GPU/);
  assert.throws(()=>buildProjectPhasePlan([phase(72,8),phase(144,8,'SW','Other')]),/same customer/);
});
test('BOM grouping sums same-PID equipment roles and preserves spare-inclusive quantities',()=>{
  const p=phase(72,5);p.design.bom.push({cat:'AI Backend Spine',pid:'SW',required:3,total:4},{cat:'Scale Unit Planning',pid:'SU-PLANNING',total:1});
  const lines=projectPhaseLines(p.design);
  assert.equal(lines.find(r=>r.pid==='SW').quantity,9);
  assert.ok(!lines.some(r=>r.pid==='SU-PLANNING'));
  p.design.bom[0].total=NaN;
  assert.throws(()=>projectPhaseLines(p.design),/Invalid BOM/);
});

test('phase UI handlers capture fresh snapshots, preserve earlier phases and export the plan',()=>{
  const controls=Object.fromEntries(['phaseName','phaseDate','phaseMode','phaseMessage','phaseResults'].map(id=>[id,{value:'',textContent:'',innerHTML:''}]));
  controls.phaseMode.value='cumulative';
  const window={};let current=phase(72,8).design,refreshes=0,exported='';
  function prepare(d){d.solution={...d.solution,computeUnits:d.solution.totalGpus/72,backendSwitches:8,rackCount:2,totalPowerKw:200,totalWeightKg:100};d.backend.backendLabel='Test 800G';return d;}
  current=prepare(current);
  const api=new Function('window','$','calc','Blob','URL','document','customerFilePrefix',
    html.slice(html.indexOf('function projectPhaseLines'),html.indexOf('function calc(){'))+';return {captureProjectPhase,removeProjectPhase,exportProjectPhases};')(
    window,id=>controls[id],()=>{refreshes++;window.DESIGN_STATE=current;},function(parts){exported=parts.join('');},
    {createObjectURL:()=>'',revokeObjectURL:()=>{}},{createElement:()=>({click(){}})},()=> 'Demo_');
  controls.phaseName.value='<Pilot>';
  api.captureProjectPhase();
  assert.equal(refreshes,1);
  assert.match(controls.phaseResults.innerHTML,/&lt;Pilot&gt;/);
  current.solution.totalGpus=144;
  assert.equal(window.PROJECT_PHASES[0].design.solution.totalGpus,72);
  current=prepare(phase(144,12).design);api.captureProjectPhase();
  assert.equal(window.PROJECT_PHASES.length,2);
  api.exportProjectPhases();
  const plan=JSON.parse(exported);
  assert.equal(plan.weightUnit,'kg');assert.equal(plan.powerUnit,'kW');
  assert.equal(plan.phases[1].comparison.find(r=>r.pid==='SW').additional,4);
  current=prepare(phase(36,4).design);api.captureProjectPhase(1);
  assert.match(controls.phaseMessage.textContent,/increase GPU/);
  assert.equal(window.PROJECT_PHASES[1].design.solution.totalGpus,144);
  api.removeProjectPhase(1);assert.equal(window.PROJECT_PHASES.length,1);
});

test('phase CCW uses incremental equipment and child counts from snapshots, not the live BOM',()=>{
  const source=html.slice(html.indexOf('function projectPhaseLines'),html.indexOf('function calc(){'));
  const get=new Function('sanitizeFilenamePart',source+';return projectPhaseCcwData;')(s=>s.replace(/[^a-z0-9_-]/gi,'_'));
  const one=phase(72,10),two=phase(144,14);
  for(const [i,p]of [one,two].entries()){
    p.design.ordering={vastTerm:60,suDesc:'Captured SU'};
    p.design.bom.push({cat:'Compute MLB',pid:'UCS-DGPUM8-MLB',total:1},
      {cat:'Compute ATO (Configurator Selection)',pid:'GPU-ATO',total:(i+1)*8},
      {cat:'Management MLB',pid:'UCS-M8-MLB',total:1},
      {cat:'Management ATO (Configurator Selection)',pid:'MGMT-ATO',total:5});
  }
  const data=get([one,two],1);
  assert.equal(data.bom.find(r=>r.pid==='SW').total,4);
  assert.equal(data.bom.find(r=>r.pid==='UCS-DGPUM8-MLB').total,1);
  assert.equal(data.computeNodes,8);
  assert.equal(data.mgmtNodes,0);
  assert.ok(!data.bom.some(r=>r.pid==='UCS-M8-MLB'||r.pid==='GPU-ATO'||r.pid==='MGMT-ATO'));
  assert.equal(data.term,60);
  assert.equal(data.bom.find(r=>r.pid==='LICENSE').total,10);
  assert.match(data.filename,/Demo_Phase_2/);
  assert.ok(data.bom.every(r=>r.spare===0));
  const independent=get([one,two],1,'independent');
  assert.equal(independent.bom.find(r=>r.pid==='SW').total,14);
  assert.equal(independent.computeNodes,16);
});

test('captured CCW exporter generates an XLSX with phase quantities without reading live inputs',async()=>{
  const source=html.slice(html.indexOf('function xmlEscape'),html.indexOf('function exportCsv'));
  let output=null,filename='';
  const link={style:{},click(){filename=this.download;},remove(){}};
  const window={CURRENT_COMPUTE_ATO:'WRONG-LIVE-ATO',CURRENT_COMPUTE_NODES:999};
  const run=new Function('window','$','BOM','Blob','URL','document','customerFilePrefix','alert','setTimeout',source+';return exportCcwXlsx;')(
    window,()=>{throw Error('Must not read live form');},[],Blob,
    {createObjectURL:blob=>{output=blob;return 'blob:test';},revokeObjectURL(){}},
    {createElement:()=>link,body:{appendChild(){}}},()=>{throw Error('Must use captured filename');},message=>{throw Error(message);},()=>{});
  run({bom:[{cat:'Compute MLB',pid:'UCS-DGPUM8-MLB',desc:'Compute',required:1,total:1},{cat:'AI Backend Leaf',pid:'SW',required:4,total:4}],term:60,computeAto:'CAPTURED-ATO',computeNodes:8,mgmtNodes:0,suDesc:'Phase SU',sparePct:0,filename:'Demo_Phase_2_CCW.xlsx'});
  assert.equal(filename,'Demo_Phase_2_CCW.xlsx');
  const bytes=new Uint8Array(await output.arrayBuffer());
  assert.deepEqual([...bytes.slice(0,4)],[80,75,3,4]);
  const xml=new TextDecoder().decode(bytes);
  assert.match(xml,/CAPTURED-ATO × 8/);
  assert.doesNotMatch(xml,/WRONG-LIVE-ATO/);
  assert.match(xml,/<c r="B3" s="0"><v>4<\/v>/);
  assert.match(xml,/CCW Upload/);
});
