const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const api = new Function(html.slice(html.indexOf('function dist'), html.indexOf('function add(cat')) +
  '; return {backendPortConsumption, backendPortConsumptionHtml, nvl72BackendDesign, backendDesign, frontendDesign, gb300EastWestDesign, gb300ConvergedDesign, gb300StorageNetwork, gb300ManagementFabric, gb300OobDesign, vastNetwork, genericOobPlan, auditFabricLayout};')();

test('backend layout sweep checks bandwidth, cages, whole peer links and optic conservation', () => {
  for (const n of [1,2,4,8,16,31,32,33,63,64,65,80,128,256,512,563,600,630,1024,1025,2048,4096]) {
    for (const topology of ['rail','classic']) for (const speed of [200,400,800]) for (const planes of [1,2]) {
      for (const links of [4,8,16]) {
        const d = api.backendDesign(n,'custom',topology,8,{profileBasis:'server',linksPerServer:links,planes,linkSpeed:speed});
        assert.equal(d.physicalHostLinks,n*links);
        assert.equal(d.leafSpineOptics,d.physicalLeafSpineLinks*2);
        if (!d.portMapVerified) { assert.equal(d.exceedsTwoTier,true); continue; }
        const q=800/speed, k=d.meshLinksPerPair;
        assert.ok(Number.isInteger(k) && k>0);
        assert.ok(d.leavesPerPlane*k/q<=64);
        d.hostLinkDist.forEach((host,i)=>{
          assert.ok(d.spinesPerPlane*k>=host);
          assert.equal(d.uplinkDist[i]*q,d.spinesPerPlane*k);
          assert.ok(d.hostCageDist[i]+d.uplinkDist[i]<=64);
        });
      }
    }
  }
});

test('GB300 two-tier layouts fit each peer and derived three-tier boundaries are explicit',()=>{
  for(let racks=1;racks<=130;racks++) {
    const d=api.gb300EastWestDesign(racks);
    assert.equal(d.hostOptics,racks*72);
    assert.equal(d.leafSpineOptics,d.physicalLeafSpineLinks*2);
    if(d.fabricTier==='2-tier') {
      assert.equal(d.portMapVerified,true);
      const pair=d.uplinkDist[0]*2/d.spinesPerPlane;
      assert.ok(Number.isInteger(pair)&&pair>0);
      assert.ok(d.leavesPerPlane*pair<=128);
      d.hostCageDist.forEach((n,i)=>assert.ok(n+d.uplinkDist[i]<=64));
    } else {
      assert.equal(d.portMapVerified,!d.derivedCapacityExceeded);
      assert.equal(d.physicalLeafSpineLinks,d.physicalSpineSuperLinks);
    }
  }
});

test('70-rack GB300 has a complete frontend mesh and sufficient routed OOB blocks',()=>{
  const be=api.gb300EastWestDesign(70), fe=api.gb300ConvergedDesign(70,2,36);
  const vn=api.gb300StorageNetwork(12,70), gbMgmt=api.gb300ManagementFabric(5);
  const switches=be.totalLeaves+be.totalSpines+fe.leaves+fe.spines+vn.switches+gbMgmt.leaves;
  const gbOob=api.gb300OobDesign(70,12,5,3,switches);
  const audit=api.auditFabricLayout({be,fe,vn,gbMgmt,gbOob,isGb:true,frontendOver:2});
  assert.deepEqual([be.totalLeaves,be.totalSpines,be.totalSuperspines],[160,128,0]);
  assert.deepEqual([fe.leaves,fe.spines,fe.physicalUplinkLinks],[40,16,640]);
  assert.equal(audit.status,'REVIEW');
  assert.ok(audit.checks.some(c=>c.domain==='Backend'&&c.status==='PASS'));
  assert.ok(audit.checks.some(c=>c.domain==='Frontend'&&c.status==='PASS'&&c.message.includes('1.969')));
  assert.ok(!audit.checks.some(c=>c.domain==='Frontend'&&c.status!=='PASS'));
  assert.ok(!audit.checks.some(c=>c.domain==='OOB'&&c.status==='FAIL'));
  assert.equal(gbOob.oobSpines,10);
  assert.ok(gbOob.pairBlocks.every(b=>b.ports+1<=36));
});

test('storage leaf budgets fit 1..256 EBoxes; shared far-end placement remains explicit',()=>{
  for(let n=1;n<=256;n++) for(const gb of [false,true]) {
    const vn=gb?api.gb300StorageNetwork(n,70):api.vastNetwork(n);
    const fe=gb?api.gb300ConvergedDesign(70):api.frontendDesign(600,5,2,2);
    const result=api.auditFabricLayout({fe,vn,isGb:gb});
    assert.equal(vn.dist.reduce((a,b)=>a+b,0),n);
    assert.ok(result.checks.some(c=>c.domain==='Storage'&&c.status==='PASS'));
    assert.ok(result.checks.some(c=>c.domain==='Shared spine'&&c.status!=='PASS'));
  }
});

test('management and OOB over-capacity cannot receive a passing layout status',()=>{
  for(const nodes of [1,5,32,60,64,128]) {
    const result=api.auditFabricLayout({gbMgmt:api.gb300ManagementFabric(nodes)});
    assert.ok(result.checks.some(c=>c.domain==='Management'&&c.status===(nodes>60?'FAIL':'PASS')));
  }
  for(let racks=1;racks<=130;racks++) {
    const gbOob=api.gb300OobDesign(racks,12,5,3,300);
    const result=api.auditFabricLayout({gbOob});
    if(gbOob.spineCapacityExceeded||gbOob.stpCapacityExceeded)assert.equal(result.status,'FAIL');
    else assert.equal(result.status,'REVIEW');
  }
});

test('all inline scripts parse and layout results feed design state and purchasing notes',()=>{
  for(const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))new Function(m[1]);
  assert.match(html,/window\.DESIGN_STATE=\{\s*layoutAudit/);
  assert.match(html,/row\.basis=.*LAYOUT/);
});


test('derived GB300 frontend meets whole-link and external-port budgets across scales and targets',()=>{
  for(let racks=1;racks<=130;racks++)for(const over of [1,2,3]){
    const d=api.gb300ConvergedDesign(racks,over,36);
    assert.equal(d.portMapVerified,true,JSON.stringify({racks,over}));
    assert.equal(d.hostSwitchOptics,d.hostCageDist.reduce((a,b)=>a+b,0));
    if(d.collapsed)continue;
    const factor=800/d.meshLinkSpeedG;
    assert.ok(Number.isInteger(d.meshLinksPerPair)&&d.meshLinksPerPair>0);
    d.endpointDist.forEach((n,i)=>{
      assert.ok(d.uplinkDist[i]*800>=n*400/over);
      assert.ok(d.hostCageDist[i]+d.uplinkDist[i]<=64);
      assert.equal(d.uplinkDist[i]*factor,d.spines*d.meshLinksPerPair);
    });
    d.externalPortDist.forEach(n=>assert.ok(d.leaves*d.meshLinksPerPair/factor+Math.ceil(n/2)<=64));
    assert.ok(d.externalPortDist.reduce((a,b)=>a+b,0)>=36);
    assert.equal(d.leafSpineOptics,d.physicalUplinkLinks*2);
    assert.equal(d.leafSpineCables,d.physicalUplinkLinks*2);
  }
});

test('GB300 OOB block maps conserve every rack and leaf and reserve upstream ports',()=>{
  for(const racks of [3,16,17,18,32,64,70,96,113,128,256,512]){
    const d=api.gb300OobDesign(racks,24,5,3,500);
    assert.equal(d.pairBlocks.reduce((a,b)=>a+b.racks,0),racks);
    assert.equal(d.pairBlocks.reduce((a,b)=>a+b.lowSpeedLeaves,0),d.lowSpeedLeaves);
    assert.ok(d.pairBlocks.every(b=>b.ports===b.racks*2+b.lowSpeedLeaves&&b.ports+1<=36));
    assert.equal(d.oobSpines,d.pairBlocks.length*2);
    assert.equal(d.upstreamLinks,d.oobSpines);
    assert.ok(d.lowSpeedLeaves*48>=d.externalLowSpeedEndpoints);
    assert.equal(d.spineCapacityExceeded,false);
  }
});

test('generic OOB includes its own management and scales optical aggregation blocks',()=>{
  for(const endpoints of [0,47,48,95,96,600,1680,1728,10000])for(const mode of ['stp1g','spine100g']){
    const d=api.genericOobPlan(endpoints,mode);
    assert.equal(d.endpoints,endpoints+d.leaves+d.spines+d.aggregators);
    assert.ok(d.leaves*48>=d.endpoints);
    if(d.spines){
      assert.ok(Math.ceil(d.leaves/(d.spines/2))<=35);
      assert.equal(d.upstreamLinks,d.spines);
    }
    if(d.aggregators)assert.ok(Math.ceil(d.leaves/(d.aggregators/2))+1<=48);
  }
});

test('NVL8 and AMD profile fixtures preserve physical NIC counts and per-plane bandwidth',()=>{
  const profiles=[
    {name:'MI355X',p:{nicProfile:'amd-mi355x',profileBasis:'server',linksPerServer:8,physicalPortsPerServer:8,linkSpeed:400,planes:1},links:8,optics:8,planes:1},
    {name:'Rubin NVL8 dual-plane',p:{nicProfile:'cx9-rubin',portMode:'sp_dp',hostInterfaceSpeed:800,linkSpeed:400,linksPerGpu:2,physicalPortsPerGpu:1},links:16,optics:8,planes:2},
    {name:'Rubin NVL8 single-plane',p:{nicProfile:'cx9-rubin',portMode:'sp_sp',hostInterfaceSpeed:800,linkSpeed:400,linksPerGpu:1,physicalPortsPerGpu:1},links:8,optics:8,planes:1},
    {name:'CX8 dual-port',p:{nicProfile:'cx8',portMode:'dp_dp',hostInterfaceSpeed:800,linkSpeed:400,linksPerGpu:2,physicalPortsPerGpu:2},links:16,optics:16,planes:2}
  ];
  for(const n of [1,16,32,70,80,600,630,1024])for(const fixture of profiles){
    const d=api.backendDesign(n,'custom','rail',8,fixture.p);
    assert.equal(d.gpus,n*8,fixture.name);
    assert.equal(d.physicalHostLinks,n*fixture.links,fixture.name);
    assert.equal(d.hostOptics,n*fixture.optics,fixture.name);
    assert.equal(d.planes,fixture.planes,fixture.name);
    assert.equal(d.portMapVerified,true,fixture.name);
    assert.ok(d.logicalLeafSpineLinks*d.speed>=d.physicalHostLinks*d.speed);
    const storage=api.vastNetwork(12), frontend=api.frontendDesign(n,5,2,2,storage.totalUplinkLinks);
    assert.equal(frontend.endpoints,(n+5)*2);
    assert.equal(frontend.portMapVerified,true);
    const infra=d.totalLeaves+d.totalSpines+frontend.leaves+frontend.spines+storage.switches;
    const oob=api.genericOobPlan(n+5+infra+24+3,'spine100g');
    assert.ok(oob.leaves*48>=oob.endpoints);
    if(oob.spines)assert.ok(Math.ceil(oob.leaves/(oob.spines/2))<=35);
  }
});

test('odd dual-plane AMD NIC counts size the busier per-server plane, not half the cluster',()=>{
  for(const n of [1,2,16,70])for(const links of [3,5,7,9]){
    const d=api.backendDesign(n,'custom','rail',8,{profileBasis:'server',nicProfile:'amd-mi355x',linksPerServer:links,physicalPortsPerServer:links,linkSpeed:400,planes:2});
    assert.equal(d.linksPerPlane,n*Math.ceil(links/2));
    assert.equal(d.hostOptics,n*links);
    assert.equal(d.physicalHostLinks,n*links);
    assert.ok(d.uplinkDist.reduce((a,b)=>a+b,0)*800>=n*Math.ceil(links/2)*400);
  }
});

test('Rubin NVL8 full racks use the same networking as nine eight-GPU servers per rack',()=>{
  const definition=html.match(/const makeBackend=n=>[^;]+;/)[0];
  const p={nicProfile:'cx9-rubin',portMode:'sp_dp',hostInterfaceSpeed:800,linkSpeed:400,linksPerGpu:2,physicalPortsPerGpu:1};
  const make=new Function('backendDesign','platform','rubinRackPid','mode','top','customGpusPerNode','customBackendProfile',definition+'return makeBackend;')(api.backendDesign,'rubin-hgx',true,'custom','rail',72,p);
  for(const racks of [1,2,16,32,70]){
    const rackDesign=make(racks), serverDesign=api.backendDesign(racks*9,'custom','rail',8,p);
    assert.deepEqual(rackDesign,serverDesign);
    assert.equal(rackDesign.gpus,racks*72);
  }
  const serverCount=html.match(/const computeServerCount=[^;]+;/)[0];
  const count=new Function('nodes','rubinRackPid',serverCount+'return computeServerCount;');
  assert.equal(count(70,true),630);
  assert.equal(count(70,false),70);
  assert.match(html,/frontendDesign\(computeServerCount,mgmt/);
  assert.match(html,/computeOobEndpoints=platform==='gb300-nvl72'\?0:computeServerCount/);
});

test('optical OOB uses 100G DR optics and duplex LC SMF for both leaf and core paths',()=>{
  const d=api.gb300OobDesign(70,12,5,3,400);
  assert.equal(d.lowSpeedUplinkSpeedG,100);
  assert.equal(d.rackUplinkSpeedG,100);
  assert.equal(api.genericOobPlan(600).uplinkSpeedG,100);
  assert.deepEqual(api.genericOobPlan(600,'spine40g'),api.genericOobPlan(600,'spine100g'));
  assert.match(html,/<option value="spine100g" selected>100G spine fabric/);
  const begin=html.indexOf("      if(gb300Oob.selectedMode==='spine'){\n        add('GB300 Low-Speed OOB Optics'");
  const end=html.indexOf("      if(gb300Oob.selectedMode!=='spine')",begin);
  assert.ok(begin>0&&end>begin);
  const rows=[];
  new Function('gb300Oob','add',html.slice(begin,end))(d,(cat,pid,desc,qty)=>rows.push({cat,pid,desc,qty}));
  assert.equal(rows.length,4);
  assert.deepEqual(rows.map(r=>r.pid),['QSFP-100G-DR-S=','CB-LC-LC-SMF','QSFP-100G-DR-S=','CB-LC-LC-SMF']);
  assert.deepEqual(rows.map(r=>r.qty),[d.lowSpeedUplinkLinks*2,d.lowSpeedUplinkLinks,d.upstreamLinks*2,d.upstreamLinks]);
  const oobRows=html.split('\n').filter(line=>/add\('.*OOB/.test(line));
  assert.ok(oobRows.every(line=>!line.includes('QSFP-40G-SR4-S=')&&!line.includes('CB-M12-M12-MMF')));
});


test('NVL72 preserves four GPU-position rails per plane at rack and scale boundaries',()=>{
  for(const platform of ['gb300-nvl72','rubin-nvl72']) for(const racks of [1,2,3,4,7,16,31,64,65,70,114,130]){
    const d=api.nvl72BackendDesign(platform,racks);
    assert.equal(d.railCount,4);
    assert.equal(d.gpusPerRailPerRack,18);
    assert.equal(d.gpus,racks*72);
    assert.equal(d.railMappingVerified,true,platform+' '+racks);
    assert.equal(d.leavesPerPlane,d.leavesPerRailPerPlane*4);
    assert.deepEqual(d.railGpuCounts,Array(4).fill(racks*18));
    for(let rail=0;rail<4;rail++){
      const hosts=d.hostLinkDist.slice(rail*d.leavesPerRailPerPlane,(rail+1)*d.leavesPerRailPerPlane);
      assert.equal(hosts.reduce((a,b)=>a+b,0),racks*18);
    }
    assert.equal(d.totalLeaves,d.leavesPerPlane*d.planes);
    assert.equal(d.leafSpineOptics,d.physicalLeafSpineLinks*2);
    if(d.portMapVerified)d.hostCageDist.forEach((c,i)=>assert.ok(c+d.uplinkDist[i]<=64));
    assert.equal(d.planes,2);
  }
  assert.match(html,/NVL72 four rails per plane/);
  assert.match(html,/railCount:be.railCount/);
});

test('Rubin NVL72 conserves 144 independent 800G ports per rack and flags two-tier overflow',()=>{
  for(const racks of [1,2,3,4,7,14,16,28,29,64,130]){
    const d=api.nvl72BackendDesign('rubin-nvl72',racks);
    assert.equal(d.gpus,racks*72);
    assert.equal(d.aggregatePerGpu,1600);
    assert.equal(d.speed,800);
    assert.equal(d.physicalPortsPerGpu,2);
    assert.equal(d.hostOptics,racks*144);
    assert.equal(d.switchHostOptics,racks*144);
    assert.equal(d.physicalHostLinks,racks*144);
    assert.equal(d.linksPerPlane,racks*72);
    assert.equal(d.hostLinkDist.reduce((a,b)=>a+b,0)*d.planes,racks*144);
    assert.equal(d.leafSpineOptics,d.physicalLeafSpineLinks*2);
    assert.match(d.backendLabel,/OEM validation required/);
    if(d.portMapVerified){
      d.hostCageDist.forEach((c,i)=>assert.ok(c+d.uplinkDist[i]<=64));
      assert.ok(Number.isInteger(d.meshLinksPerPair)&&d.meshLinksPerPair>0);
      assert.ok(d.spineCagesUsed<=64);
      assert.equal(d.physicalLeafSpineLinks,d.totalLeaves*d.spinesPerPlane*d.meshLinksPerPair);
    }
  }
  assert.equal(api.nvl72BackendDesign('rubin-nvl72',28).portMapVerified,true);
  assert.equal(api.nvl72BackendDesign('rubin-nvl72',29).portMapVerified,false);
  assert.match(html,/TBD-800G-CX9-NVL72-HOST/);
});

test('Rubin spine sweep independently reconciles 1:1 bandwidth and whole-link mesh feasibility',t=>{
  let checked=0,verified=0,review=0;
  function check(d,label){
    checked++;
    const lanes=800/d.speed;
    assert.equal(d.hostLinkDist.reduce((a,b)=>a+b,0),d.linksPerPlane,label);
    assert.equal(d.physicalHostLinks,d.linksPerPlane*d.planes,label);
    // Independent exhaustive feasibility check for this leaf allocation. Enumerate
    // physical 800G cages per peer, rather than reusing the production planner.
    const largestHost=Math.max(...d.hostLinkDist);
    let feasible=false;
    for(let s=2;s<=64*lanes&&!feasible;s++){
      for(let k=1;k<=Math.floor(64*lanes/d.leavesPerPlane);k++){
        if((s*k)%lanes || (d.leavesPerPlane*k)%lanes)continue;
        if(s*k<largestHost)continue;
        if(Math.ceil(largestHost/lanes)+s*k/lanes<=64){feasible=true;break;}
      }
    }
    assert.equal(d.portMapVerified,feasible,label+' feasibility');
    if(!feasible){
      review++;
      assert.equal(d.exceedsTwoTier,true,label);
      assert.equal(d.fabricTier,'3-tier review',label);
      return;
    }
    verified++;
    const k=d.meshLinksPerPair,s=d.spinesPerPlane,f=d.leavesPerPlane;
    assert.ok(Number.isInteger(k)&&k>0,label+' whole links');
    assert.ok(Number.isInteger(s*k/lanes),label+' leaf uplink cages');
    assert.ok(Number.isInteger(f*k/lanes),label+' spine receiving cages');
    assert.ok(f*k/lanes<=64,label+' spine port budget');
    assert.equal(d.spineCagesUsed,f*k/lanes,label);
    d.hostLinkDist.forEach((hosts,i)=>{
      const hostGbps=hosts*d.speed,upGbps=s*k*d.speed;
      assert.ok(upGbps>=hostGbps,label+' leaf '+i+' 1:1 bandwidth');
      assert.equal(d.uplinkDist[i]*800,upGbps,label+' uplink bandwidth');
      assert.equal(d.hostCageDist[i],Math.ceil(hosts/lanes),label);
      assert.ok(d.hostCageDist[i]+d.uplinkDist[i]<=64,label+' leaf port budget');
    });
    const physicalLinks=f*s*k/lanes*d.planes;
    assert.equal(d.physicalLeafSpineLinks,physicalLinks,label+' link conservation');
    assert.equal(d.leafSpineOptics,physicalLinks*2,label+' optical endpoints');
    assert.equal(d.logicalLeafSpineLinks*d.speed,physicalLinks*800,label);
    assert.ok(physicalLinks*800>=d.physicalHostLinks*d.speed,label+' cluster 1:1');
  }
  for(let racks=1;racks<=130;racks++)check(api.nvl72BackendDesign('rubin-nvl72',racks),'NVL72 '+racks+' racks');
  for(const mode of ['sp_sp','sp_dp'])for(const topology of ['rail','classic']){
    const p={nicProfile:'cx9-rubin',portMode:mode,hostInterfaceSpeed:800,linkSpeed:400,linksPerGpu:mode==='sp_dp'?2:1,physicalPortsPerGpu:1};
    for(let servers=1;servers<=1152;servers++)check(api.backendDesign(servers,'custom',topology,8,p),'NVL8 '+mode+' '+topology+' '+servers+' servers');
    for(let racks=1;racks<=130;racks++)check(api.backendDesign(racks*9,'custom',topology,8,p),'NVL8 '+mode+' '+topology+' '+racks+' full racks');
  }
  t.diagnostic(`${checked} Rubin configurations: ${verified} verified 1:1 meshes; ${review} correctly require architecture review`);
});

test('104 GB300 racks expose occupied cages separately from spare breakout branches',()=>{
  const d=api.nvl72BackendDesign('gb300-nvl72',104),p=api.backendPortConsumption(d);
  assert.deepEqual(p.leaves.map(r=>[r.switchesPerPlane,r.hostLinks,r.hostCages,r.upCages,r.freeCages]),[
    [48,63,32,32,0],[72,62,31,32,1]
  ]);
  assert.deepEqual([p.spines.switchesPerPlane,p.spines.downCages,p.spines.upCages,p.spines.freeCages],[64,60,0,4]);
  assert.equal(p.independentFabrics,1);
  assert.equal(p.leaves.reduce((s,r)=>s+r.switchesPerPlane*r.freeCages,0)*p.planes,144);
  assert.equal(p.spines.freeCages*p.spines.switchesPerPlane*p.planes,512);
  const table=api.backendPortConsumptionHtml(d);
  assert.match(table,/Host physical ports/);
  assert.match(table,/Free physical ports/);
  assert.match(table,/unused branches/);
});

test('backend port consumption reconciles tiers, independent fabrics and unverified spines',()=>{
  const designs=[];
  for(const platform of ['gb300-nvl72','rubin-nvl72'])for(let racks=1;racks<=130;racks++)designs.push(api.nvl72BackendDesign(platform,racks));
  for(const mode of ['sp_sp','sp_dp'])for(const n of [1,9,32,128,630,1152])designs.push(api.backendDesign(n,'custom','rail',8,{nicProfile:'cx9-rubin',portMode:mode,hostInterfaceSpeed:800,linkSpeed:400,linksPerGpu:mode==='sp_dp'?2:1,physicalPortsPerGpu:1}));
  for(const d of designs){
    const p=api.backendPortConsumption(d);
    assert.equal(p.leaves.reduce((s,r)=>s+r.switchesPerPlane,0),d.leavesPerPlane);
    assert.equal(p.leaves.reduce((s,r)=>s+r.switchesPerPlane*r.hostCages,0),d.hostCageDist.reduce((a,b)=>a+b,0));
    assert.equal(p.leaves.reduce((s,r)=>s+r.switchesPerPlane*r.upCages,0)*d.planes,d.physicalLeafSpineLinks);
    for(const r of p.leaves){assert.equal(r.usedCages+r.freeCages,64);assert.ok(r.freeCages>=0);}
    if(!d.portMapVerified){
      assert.equal(p.spines.freeCages,null);
      assert.match(api.backendPortConsumptionHtml(d),/Unverified/);
    }else{
      assert.equal(p.spines.downCages*d.totalSpines,d.physicalLeafSpineLinks);
      assert.equal(p.spines.upCages*d.totalSpines,d.physicalSpineSuperLinks||0);
      assert.equal(p.spines.usedCages+p.spines.freeCages,64);
      assert.ok(p.spines.freeCages>=0);
    }
  }
  const one=api.nvl72BackendDesign('rubin-nvl72',2);
  const multi={...one,totalLeaves:one.totalLeaves*3,totalSpines:one.totalSpines*3,physicalLeafSpineLinks:one.physicalLeafSpineLinks*3};
  assert.equal(api.backendPortConsumption(multi).independentFabrics,3);
  assert.equal(api.backendPortConsumption(multi).spines.freeCages,api.backendPortConsumption(one).spines.freeCages);
  assert.match(html,/setHtml\('ports',backendPortConsumptionHtml\(be\)\)/);
  assert.match(html,/portConsumption:backendPortConsumption\(be\)/);
});
