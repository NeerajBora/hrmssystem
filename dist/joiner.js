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

function sendNotice(record,kind){
const notice=model().composeNotice(record,kind);
(record.notices||(record.notices=[])).unshift(Object.assign({sentOn:stamp(),to:record.email||'the joiner'},notice));
log(record,'Email sent: '+notice.subject)}
global.joinerNotice=sendNotice;

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
/* After submitting, there is nothing for the joiner to do: the page becomes
   what NRL has told them, until access is released. */
const waitingOnNRL=!!r.submittedOn;
const waiting=r.acceptance===null?'Accept or decline your offer.'
:r.acceptance==='No'?'You declined this offer. Nothing further is needed.'
:m.joinerAwaitingAnswer(r)?'Confirm your joining date and whether you need relocation support.'
:r.accessReleasedOn?'Your HRMS access is ready. Sign in below.'
:r.submittedOn?'Thank you. Everything is with HR, and nothing is waiting on you.'
:outstanding?'Send the '+outstanding+' document(s) still outstanding below.'
:m.joinerComplete(r)?'Everything is ready. Submit your onboarding below.'
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

${waitingOnNRL?'':`${offerCard(r)}
${confirmCard(r,proposal)}
${documentCard(r,tasks)}
${submitCard(r)}
${progressCard(r)}`}
${readyCard(r)}
${noticeCard(r)}

<p class="joiner-foot">Fictional demonstration data. Uploads are recorded by file name only; no file content is stored or sent anywhere. This page has no sign-in and is not an authentication layer.</p>
</main>`};

/* ---------- offer ---------- */
function offerCard(r){
if(r.acceptance==='Yes')return '';
if(r.acceptance==='No')return `<section class="joiner-card"><h2>Offer declined</h2><p class="joiner-note">You told us on ${esc((r.history[0]||{}).date||'')} that you are not taking this offer. Your onboarding has stopped.</p></section>`;
return `<section class="joiner-card">
<h2>Your offer</h2>
${pairs([['Designation',r.designation],['Grade',r.grade],['Department',r.dept],['Work location',r.location],['Employment type',r.employmentType],['Proposed joining date',r.joiningDate],['Offer reference',r.offerRef],['Offer date',r.offerDate]])}
<h3>Terms and conditions</h3>
<ol class="joiner-terms">${model().offerTerms.map(t=>`<li>${esc(t)}</li>`).join('')}</ol>
<label class="joiner-agree"><input type="checkbox" id="joinerTerms" onchange="joinerTermsToggle()"><span>I have read and accept these terms and confirm I intend to join.</span></label>
<div class="joiner-actions">
<button class="primary" id="joinerAcceptBtn" disabled onclick="joinerAccept('${r.portalToken}')">Accept the offer</button>
<button onclick="joinerDecline('${r.portalToken}')">Decline</button>
</div></section>`}

global.joinerTermsToggle=function(){const box=$('#joinerAcceptBtn');if(box)box.disabled=!$('#joinerTerms')?.checked};

global.joinerAccept=function(token){const r=caseByToken(token);if(!r||r.acceptance!==null)return;
if(!$('#joinerTerms')?.checked)return toast('Accept the terms first.');
const previous=structuredClone(state.onboarding);
r.acceptance='Yes';r.termsAcceptedOn=stamp();
/* Accepting opens pre-joining: the joining date, relocation and the document
   checklist all arrive together, in the portal. */
r.stage=Math.max(r.stage,3);
log(r,'Terms and conditions accepted, offer accepted in the joining portal');
model().askJoiner(r,r.joiningDate||'');
log(r,'Pre-joining opened: joining date, relocation and documents are with the joiner');
sendNotice(r,'documents');
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
return `<section class="joiner-card joiner-choose">
<h2>Choose your joining date</h2>
<p class="joiner-note">Pick the date you will join and tell us whether you need relocation support. Your answer sets the date on your file; HR is told either way.</p>
<div class="formgrid">
<label class="field">Joining date<input id="joinerChosenDate" type="date" value="${esc(p.date||r.joiningDate||'')}" min="${esc(r.offerDate||'')}"></label>
</div>
<h3>Do you need relocation support?</h3>
<div class="joiner-choices">
<label><input type="radio" name="joinerReloc" id="joinerRelocYes"><span>Yes, I need relocation support</span></label>
<label><input type="radio" name="joinerReloc" id="joinerRelocNo" checked><span>No, I do not</span></label>
</div>
<label class="field full">Anything we should know?<input id="joinerDateNote" maxlength="160" placeholder="e.g. my notice period ends on 15 January"></label>
<div class="joiner-actions"><button class="primary" onclick="joinerSendAnswer('${r.portalToken}')">Confirm my joining</button></div>
</section>`}

global.joinerSendAnswer=function(token){const r=caseByToken(token);if(!r)return;
const m=model();
if(!m.joinerAwaitingAnswer(r))return;
const date=field('joinerChosenDate');
if(!date)return toast('Choose your joining date.');
if(r.offerDate&&date<r.offerDate)return toast('Your joining date cannot be before your offer date.');
const relocation=$('#joinerRelocYes')?.checked?'Needed':'Not needed';
const note=field('joinerDateNote'),previous=structuredClone(state.onboarding);
m.askJoiner(r,date);
const p=m.joinerResponse(r,{relocation,accepts:true,note});
r.items.k_relocation={state:'Verified',note:'Joiner answered: relocation '+relocation.toLowerCase(),by:r.name,date:stamp()};
r.items.k_joindate={state:'Verified',note:'Joining date '+p.date+' chosen by the joiner',by:r.name,date:stamp()};
log(r,'Joining date '+p.date+' chosen in the portal. Relocation '+relocation.toLowerCase()+'.');
if(note)log(r,'Note from the joiner: '+note);
if(!persist(r,'Joining date chosen by '+r.name,()=>{state.onboarding=previous}))return;
refresh();toast('Thank you. Your joining date is confirmed for '+p.date+'.')};

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
const outstanding=tasks.filter(i=>!['Submitted','Verified','Waived'].includes(m.itemState(r,i.id))).length;
return `<section class="joiner-card">
<h2>Your documents</h2>
<p class="joiner-note">${cleared} of ${tasks.length} cleared. HR checks each one; a document marked Failed can be sent again.</p>
${outstanding?`<div class="joiner-actions"><button onclick="joinerSendAll('${r.portalToken}')">Send all ${outstanding} documents (demo)</button></div>`:''}
<ul class="joiner-docs">${tasks.map(row).join('')}</ul>
</section>`}

/* A demonstration shortcut for the joiner: sends every document still
   outstanding at once, instead of choosing fifteen files by hand. */
global.joinerSendAll=function(token){const r=caseByToken(token);if(!r)return;
const m=model();
const pending=m.joinerTasks(r).filter(i=>!['Submitted','Verified','Waived'].includes(m.itemState(r,i.id)));
if(!pending.length)return toast('Everything is already with HR.');
const previous=structuredClone(state.onboarding);
const auto=state.autoVerify!==false;
for(const item of pending)r.items[item.id]=Object.assign(r.items[item.id]||{},{
state:auto?'Verified':'Submitted',
note:(item.kind==='signature'?'Signed by the joiner as '+r.name:'Uploaded '+item.id.replace(/^[a-z]_/,'').replace(/_/g,'-')+'.pdf')+' (demonstration fill)'+(auto?' · verified automatically for the demonstration':''),
by:r.name,date:stamp()});
log(r,pending.length+' document(s) sent from the portal for the demonstration'+(auto?' and verified automatically':''));
if(!persist(r,pending.length+' documents sent by '+r.name,()=>{state.onboarding=previous}))return;
refresh();toast(pending.length+' document(s) sent to HR.')};

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
/* The demonstration setting decides whether HR still has to check it. */
const auto=state.autoVerify!==false;
r.items[itemId]=Object.assign(r.items[itemId]||{},{state:auto?'Verified':'Submitted',note:note+(auto?' · verified automatically for the demonstration':''),by:r.name,date:stamp()});
log(r,item.name+' submitted in the portal · '+note+(auto?' · verified automatically':''));
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

/* ---------- submit everything ---------- */
function submitCard(r){
if(r.acceptance!=='Yes')return '';
const m=model();
if(!m.joinerComplete(r))return '';
return `<section class="joiner-card joiner-submit">
<h2>Send everything to HR</h2>
<p class="joiner-note">Your joining date is settled and every document on your list has been sent. Submitting starts the finance, relocation and HR record setup.</p>
<div class="joiner-actions"><button class="primary" onclick="joinerSubmitAll('${r.portalToken}')">Submit my onboarding</button></div>
</section>`}

global.joinerSubmitAll=function(token){const r=caseByToken(token);if(!r)return;
const m=model();
if(r.submittedOn||!m.joinerComplete(r))return toast('Finish your documents and joining date first.');
const previous=structuredClone(state.onboarding);
r.submittedOn=stamp();
m.runWorkflows(r,{emails:(state.onboarding||[]).map(c=>c.companyEmail).filter(Boolean),
ids:people.map(p=>p.id).concat((state.onboarding||[]).map(c=>c.employeeId).filter(Boolean)),
stamp:stamp()});
log(r,'Onboarding submitted by the joiner. Finance, logistics and HR record workflows started.');
for(const run of m.workflowStates(r))log(r,run.name+' · '+run.state+' by the onboarding agent');
sendNotice(r,'submitted');
if(!persist(r,'Onboarding submitted by '+r.name,()=>{state.onboarding=previous}))return;
refresh();toast('Submitted. Your setup has started.')};

/* ---------- access released ---------- */
function readyCard(r){
if(!r.accessReleasedOn)return '';
return `<section class="joiner-card joiner-ready">
<h2>Your HRMS access is ready</h2>
${pairs([['Employee ID',r.employeeId],['Work email',r.companyEmail],['Joining date',r.joiningDate],['Joining location',r.location],['Reporting to',r.manager]])}
<p class="joiner-note">Sign in to the HRMS portal with your employee ID to see your joining details and first-week guidance.</p>
<div class="joiner-actions"><button class="primary" onclick="joinerSignIn('${r.portalToken}')">Open my HRMS portal</button></div>
</section>`}

global.joinerSignIn=function(token){const r=caseByToken(token);if(!r||!r.accessReleasedOn)return;
signedOut=false;role='Employee';newJoiner=r.employeeId;
try{sessionStorage.setItem('samanvay-demo-role','Employee');sessionStorage.setItem('samanvay-new-joiner',r.employeeId)}catch{}
history.pushState(null,'',location.pathname+location.search);
page='Home';render();window.scrollTo(0,0)};

/* ---------- what NRL sent ---------- */
function noticeCard(r){
if(!r.notices||!r.notices.length)return '';
return `<section class="joiner-card">
<h2>Messages from NRL</h2>
<ul class="joiner-mail">${r.notices.map(n=>`<li><strong>${esc(n.subject)}</strong><small>${esc(n.sentOn)} · to ${esc(n.to)}</small><p data-i18n-user>${esc(n.body)}</p></li>`).join('')}</ul>
<p class="joiner-note">Demonstration messages. Nothing is sent to a real mailbox.</p>
</section>`}

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
