/* The joiner's own view of their onboarding case.
   The joiner accepts or declines the offer, answers the relocation question,
   accepts or suggests a joining date, uploads documents and replies to
   questions. The joiner never verifies a document, waives a step or advances a
   stage: those stay with HR. Reached at #/joining/<token>.
   This demonstration has no authentication: anyone holding the link in this
   browser sees the case. A real portal needs an identity layer. */
(function(global){
if(!global.document)return;

const stamp=()=>new Date().toLocaleString('en-IN',{timeZone:'Asia/Kolkata'});
const model=()=>global.Onboarding;
const caseByToken=token=>(state.onboarding||[]).find(r=>r.portalToken===token);
const tone=s=>['Verified','Accepted','Waived'].includes(s)?'ok':['Failed','Stopped'].includes(s)?'bad':s==='Submitted'?'info':'warn';
const chip=(text,cls)=>`<span class="badge ${cls}">${esc(text)}</span>`;
const field=id=>($('#'+id)?.value||'').trim();
const pairs=rows=>`<dl class="self-pairs">${rows.filter(([,v])=>v).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd data-i18n-user>${esc(v)}</dd></div>`).join('')}</dl>`;

function log(record,action){record.history.unshift({date:stamp(),action,by:record.name})}

function persist(record,action,undo){
try{state.audit.push({date:stamp(),actor:record.name,action});save()}
catch(e){undo();state.audit.pop();toast('Unable to save. Browser storage may be full.');return false}
return true}

const refresh=()=>{render();window.scrollTo(0,0)};

/* ---------- the page ---------- */
global.joinerPortal=function(token){
const record=caseByToken(token);
if(!record)return `<main class="joiner"><section class="joiner-card"><h1>This joining link is not recognised</h1><p class="joiner-note">Ask your onboarding coordinator for a new link.</p><div class="joiner-actions"><button onclick="joinerExit()">Back to the HRMS demo</button></div></section></main>`;
const r=record;r.items=r.items||{};r.history=r.history||[];
const m=model(),proposal=m.proposalOf(r),tasks=m.joinerTasks(r);
const stage=m.stages[r.stage-1];
const outstanding=tasks.filter(i=>['Pending','Failed'].includes(m.itemState(r,i.id))).length;
const waiting=r.acceptance===null?'Accept or decline your offer.'
:r.acceptance==='No'?'You declined this offer. Nothing further is needed.'
:m.joinerAwaitingAnswer(r)?'Confirm your joining date and whether you need relocation support.'
:outstanding?'Send the '+outstanding+' document(s) still outstanding below.'
:'Nothing is waiting on you. We will be in touch as the checks complete.';

return `<main class="joiner">
<header class="joiner-top">
<img src="assets/nrl-logo.png" alt="NRL" width="96" height="72">
<div class="joiner-brand"><strong>Joining NRL</strong><small>Samanvay onboarding · demonstration</small></div>
<button class="joiner-exit" onclick="joinerExit()">Back to the HRMS demo</button>
</header>

<section class="joiner-card joiner-hero">
<span class="eyebrow">YOUR ONBOARDING</span>
<h1 data-i18n-user>${esc(r.name)}</h1>
<p class="joiner-role" data-i18n-user>${esc(r.designation||'Role to be confirmed')}${r.dept?' · '+esc(r.dept):''}</p>
<div class="joiner-status">${chip(stage.name,r.acceptance==='No'?'bad':'info')}<span>Step ${r.stage} of 8</span></div>
<p class="joiner-waiting">${esc(waiting)}</p>
</section>

${offerCard(r)}
${confirmCard(r,proposal)}
${documentCard(r,tasks)}
${progressCard(r)}

<p class="joiner-foot">Fictional demonstration data. Uploads are recorded by file name only; no file content is stored or sent anywhere. This page has no sign-in and is not an authentication layer.</p>
</main>`};

/* ---------- offer ---------- */
function offerCard(r){
if(r.acceptance==='Yes')return '';
if(r.acceptance==='No')return `<section class="joiner-card"><h2>Offer declined</h2><p class="joiner-note">You told us on ${esc((r.history[0]||{}).date||'')} that you are not taking this offer. Your onboarding has stopped.</p></section>`;
return `<section class="joiner-card">
<h2>Your offer</h2>
${pairs([['Designation',r.designation],['Grade',r.grade],['Department',r.dept],['Work location',r.location],['Employment type',r.employmentType],['Proposed joining date',r.joiningDate],['Offer reference',r.offerRef],['Offer date',r.offerDate]])}
<p class="joiner-note">Accepting confirms that you intend to join. Your document checklist opens straight afterwards.</p>
<div class="joiner-actions">
<button class="primary" onclick="joinerAccept('${r.portalToken}')">Accept the offer</button>
<button onclick="joinerDecline('${r.portalToken}')">Decline</button>
</div></section>`}

global.joinerAccept=function(token){const r=caseByToken(token);if(!r||r.acceptance!==null)return;
const previous=structuredClone(state.onboarding);
r.acceptance='Yes';r.stage=Math.max(r.stage,2);
log(r,'Offer accepted by the joiner in the joining portal');
if(!persist(r,'Offer accepted by '+r.name,()=>{state.onboarding=previous}))return;
refresh();toast('Offer accepted. Your documents are next.')};

global.joinerDecline=function(token){const r=caseByToken(token);if(!r||r.acceptance!==null)return;
modal('Decline this offer',`<p>This tells us you are not taking the offer. Your onboarding stops and nothing further is asked of you.</p><label class="field full">Reason, if you would like to give one<input id="joinerDeclineNote" maxlength="160"></label>`,
btn('Keep my offer',"$('#dialog').close()")+btn('Decline the offer',`joinerDeclineConfirm('${token}')`,'primary'))};

global.joinerDeclineConfirm=function(token){const r=caseByToken(token);if(!r||r.acceptance!==null)return;
const note=field('joinerDeclineNote'),previous=structuredClone(state.onboarding);
r.acceptance='No';
log(r,'Offer declined by the joiner in the joining portal'+(note?' · '+note:''));
if(!persist(r,'Offer declined by '+r.name,()=>{state.onboarding=previous}))return;
$('#dialog').close();refresh();toast('Your decline has been recorded.')};

/* ---------- joining date and relocation ---------- */
function confirmCard(r,p){
if(r.acceptance!=='Yes'||p.state==='Not asked')return '';
if(p.state!=='Awaiting joiner')return `<section class="joiner-card"><h2>Your joining date</h2>${pairs([['Joining date',p.date],['Relocation',p.relocation],['Status',p.state==='Accepted'?'Agreed':p.state]])}${p.state==='Alternative proposed'?'<p class="joiner-note">Your suggested dates are with HR. We will confirm shortly.</p>':''}</section>`;
return `<section class="joiner-card">
<h2>Confirm your joining date</h2>
<p class="joiner-note">We have proposed <strong>${esc(p.date||'a date')}</strong>. Accept it, or suggest dates that suit you better.</p>
<h3>Do you need relocation support?</h3>
<div class="joiner-choices">
<label><input type="radio" name="joinerReloc" id="joinerRelocYes"><span>Yes, I need relocation support</span></label>
<label><input type="radio" name="joinerReloc" id="joinerRelocNo" checked><span>No, I do not</span></label>
</div>
<h3>Joining date</h3>
<div class="joiner-choices">
<label><input type="radio" name="joinerDate" id="joinerDateAccept" checked onchange="joinerToggleDates()"><span>I accept ${esc(p.date||'the proposed date')}</span></label>
<label><input type="radio" name="joinerDate" id="joinerDateOther" onchange="joinerToggleDates()"><span>I would like to suggest other dates</span></label>
</div>
<div id="joinerDateOptions" hidden><div class="formgrid">
<label class="field">First preference<input id="joinerAlt1" type="date"></label>
<label class="field">Second preference<input id="joinerAlt2" type="date"></label>
</div></div>
<label class="field full">Anything we should know?<input id="joinerDateNote" maxlength="160" placeholder="e.g. my notice period ends on 15 January"></label>
<div class="joiner-actions"><button class="primary" onclick="joinerSendAnswer('${r.portalToken}')">Send to HR</button></div>
</section>`}

global.joinerToggleDates=function(){const box=$('#joinerDateOptions');if(box)box.hidden=!$('#joinerDateOther')?.checked};

global.joinerSendAnswer=function(token){const r=caseByToken(token);if(!r)return;
const m=model();
if(!m.joinerAwaitingAnswer(r))return;
const accepts=!!$('#joinerDateAccept')?.checked;
const proposed=[field('joinerAlt1'),field('joinerAlt2')].filter(Boolean);
if(!accepts&&!proposed.length)return toast('Add at least one date you would prefer.');
if(!accepts&&r.offerDate&&proposed.some(d=>d<r.offerDate))return toast('A date cannot be before your offer date.');
const relocation=$('#joinerRelocYes')?.checked?'Needed':'Not needed';
const note=field('joinerDateNote'),previous=structuredClone(state.onboarding);
const p=m.joinerResponse(r,{relocation,accepts,proposed,note});
r.items.k_relocation={state:'Verified',note:'Joiner answered: relocation '+relocation.toLowerCase(),by:r.name,date:stamp()};
r.items.k_joindate=accepts
?{state:'Verified',note:'Joining date '+p.date+' accepted by the joiner',by:r.name,date:stamp()}
:{state:'Submitted',note:'Joiner suggested '+proposed.join(' or ')+'. Awaiting HR review.',by:r.name,date:stamp()};
log(r,accepts?'Joining date '+p.date+' accepted in the portal. Relocation '+relocation.toLowerCase()+'.':'Dates '+proposed.join(' or ')+' suggested in the portal. Relocation '+relocation.toLowerCase()+'.');
if(note)log(r,'Note from the joiner: '+note);
if(!persist(r,'Joining answer sent by '+r.name,()=>{state.onboarding=previous}))return;
refresh();toast(accepts?'Thank you. Your joining date is confirmed.':'Thank you. Your dates are with HR.')};

/* ---------- documents ---------- */
function documentCard(r,tasks){
if(r.acceptance!=='Yes'||!tasks.length)return '';
const m=model();
const row=item=>{const st=m.itemState(r,item.id),entry=r.items[item.id]||{};
const thread=(entry.thread||[]).map(t=>`<p class="joiner-thread"><small data-i18n-user>${esc(t.date)} · ${esc(t.by)}: ${esc(t.text)}</small></p>`).join('');
const open=st!=='Verified'&&st!=='Waived';
return `<li class="joiner-doc">
<div class="joiner-doc-head"><strong>${esc(item.name)}</strong>${chip(st==='Pending'?'Not sent':st,tone(st))}</div>
${st==='Failed'&&entry.note?`<p class="joiner-failed" data-i18n-user>${esc(entry.note)}</p>`:entry.note?`<p class="joiner-note" data-i18n-user>${esc(entry.note)}</p>`:''}
${thread}
${open?`<div class="joiner-doc-actions">
<label class="joiner-upload">${st==='Failed'?'Upload again':'Choose file'}<input type="file" accept=".pdf,.png,.jpg,.jpeg,.txt" onchange="joinerUpload('${r.portalToken}','${item.id}',this.files[0])"></label>
${item.kind==='signature'?`<button onclick="joinerSign('${r.portalToken}','${item.id}')">Sign and submit</button>`:''}
<button onclick="joinerReply('${r.portalToken}','${item.id}')">Reply to HR</button>
</div>`:''}
</li>`};
const cleared=tasks.filter(i=>['Verified','Waived'].includes(m.itemState(r,i.id))).length;
return `<section class="joiner-card">
<h2>Your documents</h2>
<p class="joiner-note">${cleared} of ${tasks.length} cleared. HR checks each one; a document marked Failed can be sent again.</p>
<ul class="joiner-docs">${tasks.map(row).join('')}</ul>
</section>`}

global.joinerUpload=function(token,itemId,file){const r=caseByToken(token);if(!r||!file)return;
const allowed=model().joinerCanSubmit(r,itemId);
if(!allowed.ok)return toast(allowed.reason);
if(file.size>5000000)return toast('Use a file smaller than 5 MB.');
if(!/\.(pdf|png|jpe?g|txt)$/i.test(file.name))return toast('Use a PDF, image or text file.');
const label=file.name.replace(/[<>\x00-\x1f]/g,'').slice(0,80)+' ('+Math.max(1,Math.round(file.size/1024))+' KB)';
submit(r,itemId,'Uploaded '+label)};

global.joinerSign=function(token,itemId){const r=caseByToken(token);if(!r)return;
const allowed=model().joinerCanSubmit(r,itemId);
if(!allowed.ok)return toast(allowed.reason);
const item=model().checklist.find(i=>i.id===itemId);
modal('Sign and submit',`<h3>${esc(item.name)}</h3><p>Signing records your name and the date against this document for HR to check. This is a demonstration, not a legal signature.</p><label class="field full">Type your full name<input id="joinerSignName" maxlength="120" placeholder="${esc(r.name)}"></label>`,
btn('Cancel',"$('#dialog').close()")+btn('Sign and submit',`joinerSignConfirm('${token}','${itemId}')`,'primary'))};

global.joinerSignConfirm=function(token,itemId){const r=caseByToken(token);if(!r)return;
const typed=field('joinerSignName');
if(typed.toLocaleLowerCase()!==r.name.toLocaleLowerCase())return toast('Type your full name exactly as it appears on this page.');
$('#dialog').close();
submit(r,itemId,'Signed by the joiner as '+typed)};

function submit(r,itemId,note){
const previous=structuredClone(state.onboarding);
const item=model().checklist.find(i=>i.id===itemId);
r.items[itemId]=Object.assign(r.items[itemId]||{},{state:'Submitted',note,by:r.name,date:stamp()});
log(r,item.name+' submitted in the portal · '+note);
if(!persist(r,'Document submitted by '+r.name+': '+item.name,()=>{state.onboarding=previous}))return;
refresh();toast(item.name+' sent to HR.')}

global.joinerReply=function(token,itemId){const r=caseByToken(token);if(!r)return;
const item=model().checklist.find(i=>i.id===itemId);
modal('Reply to HR',`<h3>${esc(item.name)}</h3><p class="sub">Your reply is logged against this document with the date.</p><label class="field full">Your message<input id="joinerReplyText" maxlength="200"></label>`,
btn('Cancel',"$('#dialog').close()")+btn('Send',`joinerReplySend('${token}','${itemId}')`,'primary'))};

global.joinerReplySend=function(token,itemId){const r=caseByToken(token);if(!r)return;
const text=field('joinerReplyText');if(!text)return toast('Write your message first.');
const previous=structuredClone(state.onboarding);
const item=model().checklist.find(i=>i.id===itemId);
const entry=r.items[itemId]||(r.items[itemId]={state:'Pending'});
(entry.thread||(entry.thread=[])).push({date:stamp(),by:r.name,text});
log(r,'Replied to HR on '+item.name);
if(!persist(r,'Joiner replied on '+item.name,()=>{state.onboarding=previous}))return;
$('#dialog').close();refresh();toast('Reply sent.')};

/* ---------- what HR is doing ---------- */
function progressCard(r){
if(r.acceptance!=='Yes')return '';
const m=model();
const ours=m.applicable(r).filter(i=>!['document','signature'].includes(i.kind)&&i.stage<=r.stage);
if(!ours.length)return '';
return `<section class="joiner-card">
<h2>Checks we are running</h2>
<p class="joiner-note">Nothing here needs anything from you.</p>
<ul class="joiner-checks">${ours.map(i=>{const st=m.itemState(r,i.id);return `<li><span>${esc(i.name)}</span>${chip(st==='Pending'?'In hand':st,tone(st))}</li>`}).join('')}</ul>
</section>`}

global.joinerExit=function(){history.pushState(null,'',location.pathname+location.search);render();window.scrollTo(0,0)};
})(typeof window!=='undefined'?window:globalThis);
