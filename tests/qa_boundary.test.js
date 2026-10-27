const {describe,it}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {calculator}=require('./helpers/calculator');

const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const start=html.indexOf('function dist');
const end=html.indexOf('function frontendDesign');
assert.ok(start>=0&&end>start,'Solver extraction boundaries must exist');
const api=new Function(html.slice(start,end)+
  ';return {dist,backendDesign,completeMeshPlan,gb300EastWestDesign,gb300OobDesign,tmgQualified};')();

describe('QA Sizer Engine - Boundary & Rigor Suite',()=>{
  describe('1. Asymmetry & Mesh Distribution Integrity',()=>{
    it('dist conserves links and places remainder links in the first buckets',()=>{
      for(const [total,buckets] of [[32,6],[64,5],[128,7],[1,4],[0,4],[64,8]]){
        const result=api.dist(total,buckets);
        assert.equal(result.length,buckets);
        assert.equal(result.reduce((a,b)=>a+b,0),total);
        assert.ok(Math.max(...result)-Math.min(...result)<=1);
        assert.deepEqual(result,Array.from({length:buckets},(_,i)=>Math.floor(total/buckets)+(i<total%buckets?1:0)));
      }
    });
    it('512 eight-NIC H200 servers fit whole-link meshes within 64 cages per leaf',()=>{
      const d=api.backendDesign(512,'custom','rail',8,{
        nicProfile:'cx7',profileBasis:'server',portMode:'sp_sp',planes:1,
        hostInterfaceSpeed:400,linkSpeed:400,linksPerServer:8,physicalPortsPerServer:8
      });
      assert.equal(d.fabricTier,'2-tier');
      assert.equal(d.portMapVerified,true);
      assert.ok(d.hostCageDist.length>0);
      assert.equal(d.hostLinkDist.reduce((a,b)=>a+b,0),4096);
      d.hostCageDist.forEach((down,i)=>assert.ok(down+d.uplinkDist[i]<=64));
      const mesh=api.completeMeshPlan(d.hostLinkDist,400);
      assert.ok(mesh);
      assert.ok(mesh.spineCages<=64);
      assert.equal(mesh.uplinks,mesh.spines*mesh.pairLinks);
    });
  });

  describe('2. GB300 NVL72 Scale Unit & Rack Constraints',()=>{
    it('scales switching across two-rack network block boundaries',()=>{
      const two=api.gb300EastWestDesign(2),four=api.gb300EastWestDesign(4);
      assert.ok(two.totalSpines>0);
      assert.ok(four.totalSpines>=two.totalSpines);
      assert.ok(four.totalLeaves>=two.totalLeaves);
      assert.equal(four.totalGpus,288);
    });
    it('reserves even network capacity while preserving odd active rack counts',()=>{
      for(const racks of [1,3,5]){
        const d=api.gb300EastWestDesign(racks),rounded=api.gb300EastWestDesign(racks+1);
        assert.equal(d.fabricRacks,Math.ceil(racks/2)*2);
        assert.equal(d.totalGpus,racks*72);
        assert.equal(d.totalLeaves,rounded.totalLeaves);
        assert.equal(d.totalSpines,rounded.totalSpines);
        assert.equal(d.hostLeafCables,racks*72*2);
      }
    });
  });

  describe('3. OOB Management Scaling Guardrails',()=>{
    it('defaults to direct at two racks and forces spine-leaf beyond two',()=>{
      assert.equal(api.gb300OobDesign(2).selectedMode,'direct');
      for(const requested of ['auto','direct','stp','spine']){
        const d=api.gb300OobDesign(3,0,0,0,0,requested);
        assert.equal(d.selectedMode,'spine');
        assert.ok(d.oobSpines>0);
        assert.equal(d.spineCapacityExceeded,false);
      }
    });
    it('provisions rack-management pairs and enough external low-speed ports',()=>{
      const d=api.gb300OobDesign(4,16,5,3,24);
      assert.equal(d.inRackMgmtSwitches,8);
      assert.ok(d.lowSpeedLeaves>=2);
      assert.ok(d.lowSpeedLeaves*48>=d.externalLowSpeedEndpoints);
      assert.equal(d.spineCapacityExceeded,false);
    });
  });

  describe('4. Optical Transceiver & TMG Qualification Normalization',()=>{
    it('normalizes spare suffixes for both qualified and unknown optics',()=>{
      for(const [device,optic,expected] of [
        ['N9364E-SG2X-O','OSFP-800G-DR8',true],
        ['N9336C-SE1','QSFP-100G-DR-S',true],
        ['N9364C-GX','QSFP-400G-DR4-S',false]
      ])for(const suffix of ['','='])assert.equal(api.tmgQualified(device,optic+suffix),expected);
    });
    it('actual BOM separates 128 host optics, 64 switch optics and DR8 branch cables',()=>{
      const d=calculator().run({platform:'amd-mi355x',nodes:16}).design;
      const rows=d.bom;
      const host=rows.filter(r=>r.cat==='AI Backend Host Optics');
      const sw=rows.filter(r=>r.cat==='AI Backend Optics'&&/host-facing/.test(r.desc||r.description||''));
      const cables=rows.filter(r=>r.cat==='AI Backend Cabling');
      const qty=rs=>rs.reduce((s,r)=>s+r.required,0);
      assert.equal(qty(host),128);
      assert.equal(qty(sw),64);
      // Dual-MPO DR8 has one cable per active 400G branch, not one fanout per cage.
      assert.equal(qty(cables),128);
    });
  });

  describe('5. Thermal & Power 25% Headroom Multiplier',()=>{
    it('production peak adjustment applies exactly once and preserves base ratings',()=>{
      const powerStart=html.indexOf('const SERVER_PEAK_POWER_FACTOR');
      const powerEnd=html.indexOf('function activateCustomSu');
      assert.ok(powerStart>=0&&powerEnd>powerStart);
      const adjust=new Function(html.slice(powerStart,powerEnd)+';return serverPeakPowerSpec;')();
      const source={powerMaxW:10000,powerTypicalW:8000};
      const peak=adjust(source);
      assert.equal(peak.powerMaxW,12500);
      assert.equal(peak.basePowerMaxW,10000);
      assert.equal(peak.powerTypicalW,8000);
      assert.equal(source.powerMaxW,10000);
      assert.equal(adjust(peak).powerMaxW,12500);
    });
  });
});
