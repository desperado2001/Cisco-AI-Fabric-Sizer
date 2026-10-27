const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','..','index.html'),'utf8');

// Run the actual application/calculation code against controls seeded from HTML.
// This harness checks wiring and arithmetic, not browser rendering or events.
function calculator(options={}){
  const controls=new Map();
  const attr=(s,key)=>s.match(new RegExp('\\b'+key+'="([^"]*)"'))?.[1];
  for(const m of html.matchAll(/<(\w+)\b([^>]*\bid="[^"]+"[^>]*)>/g)){
    const [,tag,attrs]=m,id=attr(attrs,'id');
    let markup='';
    const el={id,tagName:tag.toUpperCase(),type:attr(attrs,'type')||'',value:attr(attrs,'value')||'',checked:/\bchecked\b/.test(attrs),disabled:/\bdisabled\b/.test(attrs),style:{},dataset:{},options:[],textContent:'',classList:{toggle(){},add(){},remove(){}}};
    for(const d of attrs.matchAll(/data-([\w-]+)="([^"]*)"/g))el.dataset[d[1].replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=d[2];
    Object.defineProperty(el,'innerHTML',{get:()=>markup,set:s=>{
      markup=s;
      if(tag==='select'){
        el.options=[...s.matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/g)].map(o=>({value:attr(o[1],'value')??o[2],textContent:o[2],selected:/\bselected\b/.test(o[1])}));
        el.value=(el.options.find(o=>o.selected)||el.options[0])?.value||'';
      }
    }});
    Object.defineProperty(el,'selectedOptions',{get:()=>el.options.filter(o=>o.value===String(el.value))});
    if(tag==='select')el.innerHTML=html.slice(m.index+m[0].length,html.indexOf('</select>',m.index));
    controls.set(id,el);
  }
  const window={};
  const sizingMarkup=html.slice(html.indexOf('<section id="sizer-inputs">'),html.indexOf('</section>',html.indexOf('<section id="sizer-inputs">')));
  const sizingIds=[...sizingMarkup.matchAll(/<(?:input|select)\b[^>]*\bid="([^"]+)"/g)].map(m=>m[1]);
  const document={getElementById:id=>controls.get(id)||null,querySelectorAll:selector=>selector==='#sizer-inputs input[id], #sizer-inputs select[id]'?sizingIds.map(id=>controls.get(id)):[],createElement:options.createElement||(()=>({click(){}}))};
  const code=html.slice(html.indexOf('const UCS_GPU_CCW ='),html.indexOf('const PPT_SLIDES='));
  const api=new Function('document','window','localStorage','Blob','URL',code+`;return {calc,syncPlatform,backendDesign,frontendDesign,gb300StorageNetwork,gb300ConvergedDesign,gb300OobDesign,genericOobPlan,vastCapacity,vastQtyForTarget,vastNetwork,CDU_SPECS,PHYSICAL,runComplianceAudit,currentRequirements,saveCurrentRequirements,loadRequirementProfile,refreshSavedProfilesDropdown,exportRequirementsJSON,importRequirementsJSON,handleFileImport,captureSizingInputs};`)(document,window,options.localStorage||{setItem(){},getItem(){return null;}},Blob,options.URL||URL);
  const set=(values)=>{for(const [id,value]of Object.entries(values)){
    const el=controls.get(id);if(!el)throw new Error('Missing control '+id);
    if(typeof value==='boolean')el.checked=value;else el.value=String(value);
  }};
  const run=(values={},features={})=>{
    if(values.platform){set({platform:values.platform});api.syncPlatform();}
    set(values);
    for(const [id,enabled]of Object.entries(features))controls.get(id).dataset.enabled=String(enabled);
    api.calc();
    return {design:window.DESIGN_STATE,racks:window.LAST_RACKS,physical:window.LAST_PHYS_ROWS};
  };
  return {api,controls,window,set,run};
}
module.exports={calculator};
