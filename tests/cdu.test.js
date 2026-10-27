const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const api=new Function(html.slice(html.indexOf('const CDU_SPECS='),html.indexOf('function rackCardHtml'))+';return {CDU_SPECS,cduSelection,applyCduToRacks};')();
const select=(pid,enabled=true,platform='supermicro-b300',cooling='liquid-lcc',override='')=>api.cduSelection(platform,cooling,pid,enabled,override);
const rack=(powerW=100000)=>({id:1,role:'Compute',usedU:32,powerW,weightKg:800,items:[{name:'GPU',qty:8,ru:4}]});
const apply=(racks,cdu,bundled=false)=>api.applyCduToRacks(racks,cdu,48,300,2000,bundled);

test('CDU selector retains exact supplied PIDs and separates electrical draw from cooling capacity',()=>{
  assert.equal(Object.keys(api.CDU_SPECS).length,4);
  for(const [pid,heat,power] of [['1K3LR001',1800,20000],['200AR001',200,19000],['250LP4002',250,3000]]){
    const c=select('LCS-SCDU-'+pid);assert.equal(c.capacityKw,heat);assert.equal(c.powerW,power);
  }
  const unknown=select('LCS-SCDU-250L4002');
  assert.equal(unknown.powerW,null);assert.equal(unknown.weightKg,null);
  assert.equal(select(unknown.pid,true,'supermicro-b300','liquid-lcc','1.5').powerW,1500);
  assert.equal(select(unknown.pid,true,'supermicro-b300','liquid-lcc','-1').powerW,null);
});

test('checkbox off and air-cooled profiles do not add CDUs or change rack totals',()=>{
  for(const c of [select('LCS-SCDU-200AR001',false),select('LCS-SCDU-200AR001',true,'supermicro-b300','air'),select('LCS-SCDU-200AR001',true,'b300')]){
    const racks=[rack()],before=JSON.stringify(racks),p=apply(racks,c);
    assert.equal(p.qty,0);assert.equal(p.totalPowerW,0);assert.equal(JSON.stringify(racks),before);
  }
  for(const platform of ['gb300-nvl72','rubin-nvl72','rubin-hgx','rubin-nvl8-rack'])assert.equal(select('LCS-SCDU-200AR001',true,platform).enabled,true);
});

test('in-row pools capacity, sidecars size per rack and electrical totals conserve quantities',()=>{
  for(const [watts,qty] of [[1800000,1],[1800001,2]]){
    const p=apply([rack(watts)],select('LCS-SCDU-1K3LR001'));
    assert.equal(p.qty,qty);assert.equal(p.totalPowerW,qty*20000);assert.equal(p.totalWeightKg,qty*1560);
  }
  const racks=[rack(100000),{...rack(210000),id:2}];
  const p=apply(racks,select('LCS-SCDU-200AR001'));
  assert.equal(p.qty,2);assert.equal(p.totalPowerW,38000);assert.equal(racks.length,2);
  assert.equal(p.coolingStatus,'FAIL');assert.equal(racks[1].coolingExceeded,true);
});

test('in-rack CDU adds RU, dry weight and power; M1 uses existing rack space',()=>{
  for(const bundled of [false,true]){
    const racks=[{...rack(),fixedRack:bundled,usedU:bundled?48:32}];
    const p=apply(racks,select('LCS-SCDU-250LP4002'),bundled);
    assert.equal(racks[0].usedU,bundled?48:36);assert.equal(racks[0].powerW,103000);
    assert.equal(racks[0].weightKg,914);assert.equal(p.totalPowerW,3000);assert.equal(p.bundled,bundled);
  }
  const fixed=[{...rack(),fixedRack:true,usedU:48}];
  apply(fixed,select('LCS-SCDU-250LP4002'));
  assert.equal(fixed[0].usedU,48);assert.equal(fixed.length,2);assert.equal(fixed[1].role,'Cooling');
  assert.equal(fixed[1].usedU,4);assert.equal(fixed[1].powerW,3000);
});

test('unknown exact-PID draw stays incomplete and never uses thermal rating as electrical load',()=>{
  const racks=[rack()],p=apply(racks,select('LCS-SCDU-250L4002'));
  assert.equal(p.qty,1);assert.equal(p.totalPowerW,0);assert.equal(p.powerW,null);
  assert.ok(p.warnings.some(w=>w.includes('electrical power TBD')));
  assert.equal(racks[0].usedU,36);
});

test('server packing reserves CDU rack units, power and weight before choosing density',()=>{
  const start=html.indexOf('    const refMax=serverSpec.maxNodesPerRackRef||');
  const code=html.slice(start,html.indexOf('    const computeRacks=[];',start));
  const density=new Function('cdu','rackU','usableRackPowerKw','rackWeightKg',
    'const platform="supermicro-b300",isLiquid=true,cduCapacityKw=cdu.capacityKw,serverWeightKg=100;const serverSpec={ru:4,powerMaxW:15000,maxNodesPerRackRef:8};'+code+';return perRack;');
  const cdu=select('LCS-SCDU-250LP4002');
  assert.equal(density(cdu,12,100,2000),2);
  assert.equal(density({...cdu,enabled:false},12,100,2000),3);
  assert.equal(density(cdu,48,32,2000),1);
  assert.equal(density({...cdu,enabled:false},48,32,2000),2);
  assert.equal(density(cdu,48,300,850),7);
});

test('cooling caps density independently of available electrical power, rack units and weight',()=>{
  const start=html.indexOf('    const refMax=serverSpec.maxNodesPerRackRef||');
  const code=html.slice(start,html.indexOf('    const computeRacks=[];',start));
  const density=new Function('cdu','serverPowerW',
    'const platform="rubin-hgx",isLiquid=true,cduCapacityKw=cdu.capacityKw,serverWeightKg=50,rackU=48,usableRackPowerKw=1000,rackWeightKg=3000;const serverSpec={ru:2,powerMaxW:serverPowerW,maxNodesPerRackRef:9};'+code+';return {perRack,maxByCooling,maxByPower};');
  const sidecar=density(select('LCS-SCDU-200AR001'),30000);
  assert.equal(sidecar.perRack,6);assert.equal(sidecar.maxByCooling,6);assert.ok(sidecar.maxByPower>9);
  assert.equal(density(select('LCS-SCDU-250LP4002'),30000).perRack,8);
  assert.equal(density(select('LCS-SCDU-1K3LR001'),30000).perRack,9);
});

test('fixed rack local cooling fails above capacity without silently adding another CDU',()=>{
  for(const [pid,limit] of [['LCS-SCDU-200AR001',200000],['LCS-SCDU-250LP4002',250000]]){
    for(const delta of [0,1]){
      const racks=[{...rack(limit+delta),fixedRack:true,usedU:48}];
      const p=apply(racks,select(pid),true);
      assert.equal(p.qty,1);assert.equal(p.coolingStatus,delta?'FAIL':'PASS');
      assert.equal(racks[0].coolingExceeded,!!delta);assert.equal(racks[0].coolingLoadKw,(limit+delta)/1000);
      assert.equal(racks[0].coolingCheckLoadKw,(limit+delta)/1000);
      if(delta)assert.match(racks[0].limitingFactor,/COOLING/);
    }
  }
});

test('spare thermal capacity in another local rack does not hide an overloaded rack',()=>{
  const racks=[rack(270000),{...rack(100000),id:2}];
  const p=apply(racks,select('LCS-SCDU-250LP4002'));
  assert.ok(p.totalCapacityKw>p.heatKw);assert.equal(p.coolingStatus,'FAIL');
  assert.equal(racks[0].coolingStatus,'FAIL');assert.equal(racks[1].coolingStatus,'PASS');
  assert.equal(racks[0].coolingLoadKw,270);assert.equal(racks[0].powerW,273000);
});

test('unknown fixed-rack heat is review and cannot pass cooling adequacy',()=>{
  const racks=[{...rack(0),fixedRack:true,usedU:48}];
  const p=apply(racks,select('LCS-SCDU-1K3LR001'));
  assert.equal(p.coolingStatus,'REVIEW');assert.equal(racks[0].coolingStatus,'REVIEW');
});
