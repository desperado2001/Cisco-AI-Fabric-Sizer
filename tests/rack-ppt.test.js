const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const source=html.slice(html.indexOf('function pptRackSamples('),html.indexOf('function updatePptSelectionSummary('));
const api=new Function('PPTX_SHAPE','pptAddHeader','pptAddFooter',source+';return {pptRackSamples,pptAddRackLayouts};')(
  {rect:'rect'},(s,title,subtitle)=>s.addText(title+' '+subtitle,{}),(s,d)=>s.addText(d.customer,{})
);
const rack=(id,role='Compute')=>({id,role,usedU:8,powerKw:12,weightKg:100,items:[{name:'GPU server',qty:2,ru:4}]});

test('rack samples cover each type, cap at three and retain the final partial rack',()=>{
  const racks=[1,2,3,4,5].map(id=>rack(id));
  racks.push(rack(6,'Storage'),rack(7,'Management'),rack(8,'Management'));
  const groups=api.pptRackSamples(racks);
  assert.deepEqual(groups.map(g=>[g.type,g.total,g.racks.map(r=>r.id)]),[
    ['Compute',5,[1,3,5]],['Storage',1,[6]],['Management',2,[7,8]]
  ]);
  assert.deepEqual(api.pptRackSamples([]),[]);
});

test('rack slides preserve live inventory, unknowns, dedicated capacity and over-limit warnings',()=>{
  const slides=[];
  const pptx={addSlide(){const objects=[];slides.push(objects);return {
    addText(text,opts){objects.push({text,...opts});},addShape(shape,opts){objects.push({shape,...opts});}
  };}};
  const fixed={...rack(9,'Fixed'),fixedRack:true,usedU:48,powerKw:0,weightKg:0,items:[{name:'NVL72',qty:1,ru:48}]};
  api.pptAddRackLayouts(pptx,{customer:'Current Customer',facility:{racks:[rack(1),fixed],rackU:42,usableRackPowerKw:10,rackWeightKg:1000}});
  assert.equal(slides.length,2);
  const texts=slides.map(s=>s.filter(o=>o.text).map(o=>o.text).join('\n'));
  assert.match(texts[0],/2 × GPU server · 8U/);
  assert.match(texts[0],/34U free/);
  assert.match(texts[0],/Constraint exceeded/);
  assert.match(texts[1],/Rack 9 · Dedicated/);
  assert.match(texts[1],/48\/48U · Power TBD · Weight TBD/);
  assert.match(texts[1],/Current Customer/);
  for(const slide of slides)for(const obj of slide){
    if(obj.x===undefined)continue;
    assert.ok(obj.x>=0&&obj.y>=0&&obj.x+obj.w<=13.334&&obj.y+obj.h<=7.5);
  }
});
