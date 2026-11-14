/* Local interface localisation: no external text or employee data transmission. */
(()=>{
const pack=window.SAMANVAY_HI||{},normalise=s=>s.replace(/\s+/g,' ').trim();
const exact=new Map(Object.entries(pack).map(([en,hi])=>[normalise(en).toLowerCase(),hi]));
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const keys=Object.keys(pack).filter(s=>s.length>1).sort((a,b)=>b.length-a.length);
const fragments=new RegExp('(?<![A-Za-z])(?:'+keys.map(escape).join('|')+')(?=$|[^A-Za-z])','gi');
const nodes=new WeakMap(),attributes=new WeakMap();let current='en',observer=null,busy=false;
function translate(text,exactOnly=false){
if(current!=='hi'||typeof text!=='string'||!/[A-Za-z]/.test(text))return text;
const trimmed=normalise(text),found=exact.get(trimmed.toLowerCase());
if(found)return text.match(/^\s*/)[0]+found+text.match(/\s*$/)[0];
if(exactOnly)return text;
if(/^Good morning,\s*(.+)\.$/.test(trimmed))return 'सुप्रभात, '+trimmed.match(/^Good morning,\s*(.+)\.$/)[1]+'।';
if(/^Private to /.test(trimmed))return trimmed.slice(11)+' के लिए निजी';
if(/^For /.test(trimmed))return trimmed.slice(4)+' के लिए';
if(/^User account for /.test(trimmed))return trimmed.slice(17)+' का उपयोगकर्ता खाता';
if(/^Showing (\d+) pending requests$/.test(trimmed))return trimmed.match(/\d+/)[0]+' लंबित अनुरोध दिखाए जा रहे हैं';
if(/^Showing (\d+) requests$/.test(trimmed))return trimmed.match(/\d+/)[0]+' अनुरोध दिखाए जा रहे हैं';
const protectedParts=text.split(/([A-Za-z0-9_.+-]+@[A-Za-z0-9.-]+|[A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)+|[A-Za-z0-9_.-]+\.(?:txt|csv|png|jpg|pdf|xlsx))/g);return protectedParts.map((part,i)=>i%2?part:part.replace(fragments,value=>exact.get(normalise(value).toLowerCase())||value)).join('');
}
function sourceRecord(map,key,actual){const prev=map.get(key);if(!prev||actual!==prev.rendered){const record={source:actual,rendered:actual};map.set(key,record);return record}return prev}
function apply(root=document.body,language=current){
current=language==='hi'?'hi':'en';document.documentElement.lang=current;document.title=current==='hi'?'एनआरएल | समन्वय एचआरएमएस':'NRL | Samanvay HRMS';
if(!root||busy)return;busy=true;observer?.disconnect();
try{
const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;
while(node=walk.nextNode()){
const parent=node.parentElement;if(!parent||parent.closest('script,style,textarea,input,[data-no-translate],.languageToggle'))continue;
if(parent.tagName==='OPTION'&&!parent.hasAttribute('value'))parent.setAttribute('value',parent.textContent);
const rec=sourceRecord(nodes,node,node.nodeValue),out=translate(rec.source,!!parent.closest('[data-i18n-user]'));
if(node.nodeValue!==out)node.nodeValue=out;rec.rendered=out;
}
const els=[...(root.nodeType===1?[root]:[]),...root.querySelectorAll('[placeholder],[title],[aria-label],[alt]')];
for(const el of els){if(el.closest('[data-no-translate]'))continue;let dict=attributes.get(el);if(!dict){dict={};attributes.set(el,dict)}for(const name of ['placeholder','title','aria-label','alt']){if(!el.hasAttribute(name))continue;const actual=el.getAttribute(name);let rec=dict[name];if(!rec||actual!==rec.rendered)rec=dict[name]={source:actual,rendered:actual};const out=translate(rec.source);if(out!==actual)el.setAttribute(name,out);rec.rendered=out}}
}finally{busy=false;observe()}
}
function observe(){if(observer&&document.body)observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['placeholder','title','aria-label','alt']})}
function start(){if(observer)return;observer=new MutationObserver(()=>apply(document.body,current));observe();apply(document.body,current)}
window.HRMSI18N={apply,translate,start,has:text=>exact.has(normalise(text).toLowerCase()),get language(){return current}};
})();
