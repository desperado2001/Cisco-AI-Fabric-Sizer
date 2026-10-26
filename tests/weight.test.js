const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const physical=html.slice(html.indexOf('const PHYSICAL='),html.indexOf('function buildRackLayout'));
const rackCode=html.slice(html.indexOf('function buildRackLayout'),html.indexOf('function spareApplies'));
const api=new Function(physical+rackCode+';return {PHYSICAL,buildRackLayout,rackCardHtml};')();
test('physical weights convert pound source values into kilograms without converting unknowns',()=>{
  const fixtures=[['server','b300',330,null],['server','supermicro-b300-lcc',186.5,222],['server','rubin-hgx',154,null],['switch','N9164E-NS4-O',60.54,null],['management','ND-NODE-G5S',42.43,null],['storage','UCSC-C225M8N-EBOX',40,null]];
  for(const [group,key,net,gross]of fixtures){
    const spec=api.PHYSICAL[group][key];
    assert.ok(Math.abs(spec.weightNetKg-net*0.45359237)<1e-7,key);
    if(gross===null)assert.equal(spec.weightGrossKg,null);
    else assert.ok(Math.abs(spec.weightGrossKg-gross*0.45359237)<1e-7,key);
  }
  assert.equal(api.PHYSICAL.server['rubin-nvl72'].weightNetKg,0);
  assert.match(html,/id="mgmtServerWeightKg"[^>]+value="18.14"/);
  assert.match(html,/id="rubinWeightKg"[^>]+value="69.85"/);
  assert.match(html,/id="rackWeightLimitKg"[^>]+value="1360.78"/);
});
test('rack packing enforces kilogram limits and cards display the same units',()=>{
  const item={name:'Test server',qty:3,ru:1,powerW:100,weightKg:40,role:'Compute'};
  const racks=api.buildRackLayout([item],48,60,100,'role');
  assert.deepEqual(racks.map(r=>r.weightKg),[80,40]);
  assert.equal(racks.reduce((s,r)=>s+r.weightKg,0),120);
  assert.match(api.rackCardHtml(racks[0],48,60,100),/80\/100 kg/);
});
test('CSV exports kilogram columns and unchanged kilogram numeric values',()=>{
  const source=html.slice(html.indexOf('function exportCsv(){'),html.indexOf('try{\n  const savedCustomer',html.indexOf('function exportCsv(){')));
  let csv='';
  const window={LAST_PHYS_ROWS:[{name:'Server',qty:2,powerW:1000,totalPowerW:2000,weightKg:12.5,totalWeightKg:25,source:'Test'}],LAST_RACKS:[{id:1,role:'Compute',usedU:2,powerW:2000,weightKg:25,items:[]}]};
  const Blob=function(parts){csv=parts.join('');};
  const URL={createObjectURL:()=>'',revokeObjectURL:()=>{}};
  const document={createElement:()=>({click(){}})};
  new Function('window','Blob','URL','document','BOM','customerFilePrefix',source+';exportCsv();')(window,Blob,URL,document,[],()=> '');
  assert.match(csv,/WeightPerUnit_kg,TotalWeight_kg/);
  assert.match(csv,/Weight_kg,Cooling/);
  assert.match(csv,/12.50,25.00/);
  assert.doesNotMatch(csv,/_lb/);
});
