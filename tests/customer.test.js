const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const html = fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const source = html.slice(html.indexOf('function sanitizeFilenamePart'),html.indexOf('function featureOn'));

test('customer edits and clearing replace the previous customer in the design and filenames',()=>{
  const input={value:'Advanced AI'};
  const window={DESIGN_STATE:{customer:'Advanced AI'}};
  const saved=new Map();
  const api=new Function('$','window','localStorage',source+';return {syncCustomerName,customerFilePrefix};')(
    ()=>input,window,{setItem:(key,value)=>saved.set(key,value)}
  );
  input.value='  New Customer  ';
  api.syncCustomerName();
  assert.equal(window.DESIGN_STATE.customer,'New Customer');
  assert.equal(window.CURRENT_CUSTOMER_NAME,'New Customer');
  assert.equal(api.customerFilePrefix(),'New_Customer_');
  assert.equal(saved.get('ciscoAiFactoryCustomerName'),'New Customer');
  input.value='';
  api.syncCustomerName();
  assert.equal(window.DESIGN_STATE.customer,'Customer');
  assert.equal(api.customerFilePrefix(),'');
});

test('PowerPoint refreshes live customer input and calculation before consuming its design',()=>{
  const start=html.indexOf('async function exportDesignPptx()');
  const end=html.indexOf('const selected=getSelectedPptSlides();',start);
  const preamble=html.slice(start,end).replace('async function exportDesignPptx(){','');
  const window={DESIGN_STATE:{customer:'Advanced AI'}};
  const calls=[];
  const run=new Function('window','JSZip','PptxGenJS','syncCustomerName','calc','alert',preamble+'return d;}catch(e){throw e;}');
  const d=run(window,{},function(){},()=>calls.push('customer'),()=>{
    calls.push('calc');window.DESIGN_STATE={customer:'Current Customer'};
  },()=>{});
  assert.deepEqual(calls,['customer','calc']);
  assert.equal(d.customer,'Current Customer');
});
