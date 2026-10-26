const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const physical=html.slice(html.indexOf('const PHYSICAL='),html.indexOf('function buildRackLayout'));
const power=html.slice(html.indexOf('const SERVER_PEAK_POWER_FACTOR'),html.indexOf('function activateCustomSu'));
function api(inputs={}){
  return new Function('$',physical+power+';return {PHYSICAL,serverPeakPowerSpec,computeUnitPowerForSizing};')(id=>({value:inputs[id]}));
}
test('server maximum headroom preserves source ratings and applies once across profiles',()=>{
  const a=api();
  for(const section of ['server','management','storage'])for(const spec of Object.values(a.PHYSICAL[section])){
    const before=JSON.stringify(spec),p=a.serverPeakPowerSpec(spec);
    assert.equal(p.powerMaxW,spec.powerMaxW*1.25);
    assert.equal(p.basePowerMaxW,spec.powerMaxW);
    assert.equal(a.serverPeakPowerSpec(p).powerMaxW,p.powerMaxW);
    assert.equal(JSON.stringify(spec),before);
  }
  assert.equal(a.serverPeakPowerSpec(a.PHYSICAL.server.b300).powerMaxW,17875);
  assert.equal(a.serverPeakPowerSpec(a.PHYSICAL.server['gb300-nvl72']).powerMaxW,177500);
  assert.equal(a.serverPeakPowerSpec(a.PHYSICAL.server['rubin-nvl72']).powerMaxW,0);
  assert.equal(a.serverPeakPowerSpec(a.PHYSICAL.storage['UCSC-C225M8N-EBOX']).powerMaxW,1125);
});
test('power-budget sizing uses adjusted peak and reconciles Rubin nine-server racks',()=>{
  const a=api({rubinPowerKw:'24',rackScalePid:'SYS222GS-R2BTALC1',coolingType:'air'});
  for(const name of ['b300','h200','gb300-nvl72','custom']){
    const p=a.computeUnitPowerForSizing(name);
    assert.equal(p.powerW,a.serverPeakPowerSpec(a.PHYSICAL.server[name]).powerMaxW);
  }
  assert.equal(Math.floor(1000000/a.computeUnitPowerForSizing('b300').powerW),55);
  assert.equal(a.computeUnitPowerForSizing('gb300-nvl72','typical').powerW,140000);
  assert.equal(a.computeUnitPowerForSizing('rubin-hgx').powerW,30000);
  const rack=api({rubinPowerKw:'24',rackScalePid:'SRS-RUBIN-NVL8-M0'});
  assert.equal(rack.computeUnitPowerForSizing('rubin-nvl8-rack').powerW,270000);
  assert.equal(Math.floor(1000000/rack.computeUnitPowerForSizing('rubin-nvl8-rack').powerW),3);
  assert.equal(a.computeUnitPowerForSizing('amd-mi355x').label,'Power TBD');
});

test('peak headroom changes rack packing and facility rows while preserving switch power',()=>{
  const a=api(),spec=a.PHYSICAL.server.b300,p=a.serverPeakPowerSpec(spec);
  const rackSource=html.slice(html.indexOf('function buildRackLayout'),html.indexOf('function rackCardHtml'));
  const pack=new Function(rackSource+';return buildRackLayout;')();
  const item={name:'B300',qty:4,ru:10,weightKg:spec.weightNetKg,role:'Compute'};
  assert.equal(pack([{...item,powerW:spec.powerMaxW}],48,60,3000,'role').length,1);
  const racks=pack([{...item,powerW:p.powerMaxW}],48,60,3000,'role');
  assert.equal(racks.length,2);
  assert.equal(racks.reduce((s,r)=>s+r.powerW,0),71500);
  assert.ok(racks.every(r=>r.powerW<=60000));
  const rowSource=html.slice(html.indexOf('  function pRow(name,qty,spec)'),html.indexOf('  pRow(serverSpec.name,nodes,'));
  for(const basis of ['max','typical']){
    const rows=new Function('powerBasis','weightBasis','spec','sw',
      'const physRows=[];'+rowSource+';pRow("Compute",4,{...spec,powerTypicalW:null});pRow("Switch",2,sw);return physRows;')(
      basis,'net',p,a.PHYSICAL.switch['N9164E-NS4-O']);
    assert.equal(rows[0].totalPowerW,71500);
    assert.equal(rows[1].totalPowerW,2*(basis==='typical'?1455:2209));
  }
});
