(function(global){
/* Columns an uploaded list may carry. Only the employee name is required. */
const csvColumns={
designation:['designation','role','job title','position'],
grade:['grade','pay grade'],
dept:['department','dept','unit','department / unit'],
location:['work location','location','site'],
employmentType:['employment type','employment'],
joiningDate:['joining date','proposed joining date','date of joining'],
offerRef:['offer reference','offer ref','offer id'],
offerDate:['offer date'],
email:['personal email','email','email address'],
phone:['mobile','phone','mobile number','contact number'],
dob:['date of birth','dob'],
address:['address','correspondence address'],
manager:['reporting manager','manager','reports to'],
coordinator:['onboarding coordinator','coordinator'],
experienced:['has previous employment','previous employment','experienced'],
screening:['background checks','screening'],
workAuth:['work authorisation','work authorization'],
licence:['professional licence','professional license','licence'],
security:['security clearance','clearance'],
relocating:['relocation','relocation support','relocating']};
const csvFlags=['experienced','screening','workAuth','licence','security','relocating'];
const employmentTypes=['Permanent executive','Permanent non-executive','Fixed-term contract','Agency contract','Apprentice / trainee'];

function parse(text,existing=[]){if(text.length>200000)throw Error('Use a file smaller than 200 KB.');const rows=[];let row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(c===','&&!quoted){row.push(cell);cell=''}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell=''}else cell+=c}if(quoted)throw Error('Unclosed quotation mark. Please check your CSV file.');row.push(cell);rows.push(row);const nonempty=rows.filter(r=>r.some(c=>c.trim()));if(nonempty.length>501)throw Error('Upload at most 500 employees at a time.');const headers=nonempty[0]?.map(c=>c.replace(/^﻿/,'').trim().toLowerCase())||[];let column=headers.findIndex(c=>['name','employee name','full name','employee_name'].includes(c));const hasHeader=column>=0;if(!hasHeader)column=0;if(!hasHeader&&nonempty.some(r=>r.length>1))throw Error('For multiple columns include an Employee Name header.');const seen=new Set(existing.map(n=>n.trim().toLocaleLowerCase()));const columns={};for(const [key,names] of Object.entries(csvColumns)){const at=headers.findIndex(h=>names.includes(h));if(at>=0)columns[key]=at}
return nonempty.slice(hasHeader?1:0).map((r,i)=>{const name=(r[column]||'').replace(/^﻿/,'').trim().replace(/\s+/g,' ');let issue='';const key=name.toLocaleLowerCase();if(!name)issue='Name required';else if(name.length>120||/[<>\x00-\x1f]/.test(name)||/^[=+@]/.test(name))issue='Invalid name';else if(seen.has(key))issue='Duplicate name — review separately';if(!issue)seen.add(key);const fields={};
if(hasHeader)for(const key of Object.keys(columns)){const raw=String(r[columns[key]]||'').replace(/^\uFEFF/,'').trim();if(!raw)continue;
if(key==='employmentType'){const match=employmentTypes.find(t=>t.toLowerCase()===raw.toLowerCase());if(match)fields[key]=match;else if(!issue)issue='Unknown employment type: '+raw;continue}
if(key==='joiningDate'||key==='offerDate'||key==='dob'){if(/^\d{4}-\d{2}-\d{2}$/.test(raw))fields[key]=raw;else if(!issue)issue='Use YYYY-MM-DD dates';continue}
if(csvFlags.includes(key)){fields[key]=/^(y|yes|true|1)$/i.test(raw);continue}
if(key==='phone'){if(/^\+?[0-9][0-9 ()-]{4,19}$/.test(raw))fields[key]=raw;else if(!issue)issue='Invalid mobile number';continue}
if(/[<>\x00-\x1f]/.test(raw)||/^[=+@]/.test(raw)){if(!issue)issue='Invalid value in '+key;continue}
fields[key]=raw.slice(0,200)}
return {name,row:i+(hasHeader?2:1),issue,fields}})}

/* ---------------------------------------------------------------------------
   Onboarding process model: one case, one checklist, one chain.
   Eight stages from offer issued to onboarding complete. A person approves
   every step; nothing advances, pays, or clears by itself.
--------------------------------------------------------------------------- */
const stages=[
{n:1,id:'offer',name:'Offer issued',note:'Offer file uploaded. Offer email sent to the joiner. No document portal link yet.'},
{n:2,id:'accepted',name:'Offer accepted',note:'Acceptance recorded and joining date confirmed. Portal link for documents released.'},
{n:3,id:'prejoin',name:'Pre-joining in progress',note:'Joiner fills the profile and uploads documents. Verification runs document by document.'},
{n:4,id:'ready',name:'Ready to join',note:'Readiness reviewed: documents, approvals, screening, equipment and joining confirmation.'},
{n:5,id:'reported',name:'Reported for joining',note:'Joiner reported. Identity confirmed, originals checked, remaining signatures collected.'},
{n:6,id:'active',name:'Active employee',note:'Safety training done, gate pass issued, employee record activated as the system of record.'},
{n:7,id:'induction',name:'Induction and role onboarding',note:'Induction, buddy check, first-week schedule and unit training with expiry dates.'},
{n:8,id:'complete',name:'Onboarding complete',note:'Training, benefit enrollment and permitted follow-ups closed, with owner and date.'}];

const checklist=[
{id:'d_identity',name:'Identity proof',group:'Joiner documents',stage:3,kind:'document'},
{id:'d_education',name:'Education certificates',group:'Joiner documents',stage:3,kind:'document'},
{id:'d_experience',name:'Experience certificates',group:'Joiner documents',stage:3,kind:'document',when:'experienced'},
{id:'d_work_auth',name:'Work authorisation',group:'Joiner documents',stage:3,kind:'document',hard:true,when:'workAuth'},
{id:'d_bank',name:'Bank account details',group:'Joiner documents',stage:3,kind:'document'},
{id:'d_tax',name:'Tax declaration',group:'Joiner documents',stage:3,kind:'document'},
{id:'d_statutory',name:'Statutory details (PF, ESI, UAN)',group:'Joiner documents',stage:3,kind:'document'},
{id:'d_benefits',name:'Benefit selections',group:'Joiner documents',stage:3,kind:'document'},
{id:'d_nominee',name:'Nominee declaration',group:'Joiner documents',stage:3,kind:'document'},
{id:'d_dependents',name:'Dependent details',group:'Joiner documents',stage:3,kind:'document'},
{id:'b_employment',name:'Employment history check',group:'Background checks',stage:3,kind:'check',when:'screening'},
{id:'b_qualification',name:'Qualification and marksheet verification',group:'Background checks',stage:3,kind:'check',when:'screening'},
{id:'b_reference',name:'Reference check',group:'Background checks',stage:3,kind:'check',when:'screening'},
{id:'b_role',name:'Role-specific requirement check',group:'Background checks',stage:3,kind:'check',when:'screening'},
{id:'c_medical',name:'Medical fitness',group:'Joining conditions',stage:3,kind:'condition',hard:true},
{id:'c_licence',name:'Professional licence',group:'Joining conditions',stage:3,kind:'condition',hard:true,when:'licence'},
{id:'c_security',name:'Security clearance',group:'Joining conditions',stage:3,kind:'condition',when:'security'},
{id:'c_other',name:'Other eligibility checks',group:'Joining conditions',stage:3,kind:'condition',optional:true},
{id:'k_relocation',name:'Relocation requirement confirmed by joiner',group:'Joining confirmation',stage:3,kind:'task'},
{id:'k_joindate',name:'Joining date accepted by joiner',group:'Joining confirmation',stage:3,kind:'task'},
{id:'p_relieving',name:'Relieving document',group:'Previous employment',stage:3,kind:'document',when:'experienced'},
{id:'p_release',name:'Release confirmation from previous employer',group:'Previous employment',stage:3,kind:'check',when:'experienced'},
{id:'p_settlement',name:'Outstanding settlement information',group:'Previous employment',stage:3,kind:'document',when:'experienced',optional:true},
{id:'s_agreement',name:'Employment agreement',group:'Employment documents',stage:3,kind:'signature'},
{id:'s_confidentiality',name:'Confidentiality agreement',group:'Employment documents',stage:3,kind:'signature'},
{id:'s_ip',name:'Intellectual-property terms',group:'Employment documents',stage:3,kind:'signature'},
{id:'s_declarations',name:'Declarations',group:'Employment documents',stage:3,kind:'signature'},
{id:'s_policy',name:'Policy acknowledgements',group:'Employment documents',stage:5,kind:'signature'},
{id:'l_travel',name:'Travel arrangement',group:'Relocation and logistics',stage:4,kind:'task',when:'relocating'},
{id:'l_accommodation',name:'Accommodation',group:'Relocation and logistics',stage:4,kind:'task',when:'relocating'},
{id:'l_transport',name:'Transport',group:'Relocation and logistics',stage:4,kind:'task',when:'relocating'},
{id:'l_access',name:'Accessibility needs',group:'Relocation and logistics',stage:4,kind:'task',optional:true},
{id:'r_documents',name:'Outstanding documents cleared',group:'Joining readiness',stage:4,kind:'task'},
{id:'r_approvals',name:'Approvals complete',group:'Joining readiness',stage:4,kind:'task'},
{id:'r_screening',name:'Screening conditions satisfied',group:'Joining readiness',stage:4,kind:'task'},
{id:'r_equipment',name:'Equipment allocated',group:'Joining readiness',stage:4,kind:'task'},
{id:'r_confirmation',name:'Joining confirmation sent',group:'Joining readiness',stage:4,kind:'task'},
{id:'r_firstday',name:'First-day instructions issued',group:'Joining readiness',stage:4,kind:'task'},
{id:'r_manager',name:'Manager role preparation',group:'Joining readiness',stage:4,kind:'task'},
{id:'r_it',name:'IT access prepared',group:'Joining readiness',stage:4,kind:'task'},
{id:'j_reported',name:'Joining time and date recorded',group:'Reporting day',stage:5,kind:'task'},
{id:'j_identity',name:'Identity confirmed in person',group:'Reporting day',stage:5,kind:'task'},
{id:'j_originals',name:'Original documents checked',group:'Reporting day',stage:5,kind:'task'},
{id:'a_safety',name:'One-day safety training completed',group:'Activation',stage:6,kind:'task',hard:true},
{id:'a_gate',name:'Saral Pravesh smart card gate pass issued',group:'Activation',stage:6,kind:'task',hard:true},
{id:'a_sap',name:'Employee record activated in SAP',group:'Activation',stage:6,kind:'task',hard:true},
{id:'a_payroll',name:'Payroll and benefits confirmed',group:'Activation',stage:6,kind:'task'},
{id:'a_attendance',name:'Attendance and leave confirmed',group:'Activation',stage:6,kind:'task'},
{id:'a_access',name:'Equipment and physical access confirmed',group:'Activation',stage:6,kind:'task'},
{id:'i_induction',name:'Induction session completed',group:'Induction',stage:7,kind:'task'},
{id:'i_team',name:'Team, policy and security introduction',group:'Induction',stage:7,kind:'task'},
{id:'i_buddy',name:'Buddy checked the first-week schedule',group:'Induction',stage:7,kind:'task'},
{id:'i_training',name:'Unit training recorded with expiry dates',group:'Induction',stage:7,kind:'task'},
{id:'i_roster',name:'Roster certification gaps flagged',group:'Induction',stage:7,kind:'task'},
{id:'f_training',name:'Training closed',group:'Completion',stage:8,kind:'task'},
{id:'f_benefits',name:'Benefit enrollment closed',group:'Completion',stage:8,kind:'task'},
{id:'f_followups',name:'Permitted document follow-ups closed',group:'Completion',stage:8,kind:'task'}];

const groups=[...new Set(checklist.map(i=>i.group))];
const states=['Pending','Submitted','Verified','Failed','Waived'];
const closed=s=>s==='Verified'||s==='Waived';

function flagsOf(record){return {experienced:!!record.experienced,workAuth:!!record.workAuth,licence:!!record.licence,security:!!record.security,relocating:!!record.relocating,screening:record.screening!==false}}
function applicable(record){const flags=flagsOf(record);return checklist.filter(item=>!item.when||flags[item.when])}
function itemState(record,id){return record.items&&record.items[id]&&record.items[id].state||'Pending'}

function summary(record){
const items=applicable(record),due=items.filter(i=>i.stage<=record.stage);
const failed=due.filter(i=>itemState(record,i.id)==='Failed');
const open=due.filter(i=>!closed(itemState(record,i.id))&&!i.optional);
const hardOpen=open.filter(i=>i.hard);
const done=items.filter(i=>closed(itemState(record,i.id))).length;
const status=record.acceptance==='No'?'Stopped':record.stage===1&&record.acceptance!=='Yes'?'Awaiting acceptance':record.stage>=8&&!open.length?'Complete':failed.length||hardOpen.length?'Blocked':!open.length?'Ready':record.stage>=6?'Pending follow-up':'In progress';
const note=record.items&&failed.length?(record.items[failed[0].id]||{}).note:'';
return {status,failed,open,hardOpen,due,items,done,total:items.length,
percent:items.length?Math.round(done/items.length*100):0,
missing:open.map(i=>i.name),
reason:record.acceptance==='No'?'The joiner declined the offer':record.stage===1&&record.acceptance!=='Yes'?'Offer acceptance not recorded yet':failed.length?failed[0].name+' failed: '+(note||'reason not recorded'):hardOpen.length?hardOpen[0].name+' is a hard block and is not cleared':open.length?open.length+' item(s) outstanding':''}}

function canAdvance(record){
if(record.stage>=8)return {ok:false,reason:'This case is already complete.'};
if(record.acceptance==='No')return {ok:false,reason:'The joiner declined the offer. The case is stopped.'};
if(record.stage===1)return record.acceptance==='Yes'?{ok:true}:{ok:false,reason:'Record the offer acceptance before onboarding starts.'};
const s=summary(record);
if(s.failed.length)return {ok:false,reason:'Resolve the failed item: '+s.failed[0].name+'.'};
if(s.open.length)return {ok:false,reason:'Outstanding at this stage: '+s.missing.slice(0,3).join(', ')+(s.missing.length>3?' and '+(s.missing.length-3)+' more':'')+'.'};
return {ok:true}}

/* ---------------------------------------------------------------------------
   Joining confirmation, employee identifier and the profile draft.
   The joiner answers the relocation question and either accepts the proposed
   joining date or suggests other dates, which HR then reviews. The identifier
   is issued when the case reaches Ready to join, and the profile is drafted
   from the case for HR to review and approve. Nothing is created silently.
--------------------------------------------------------------------------- */
const proposalStates=['Not asked','Awaiting joiner','Accepted','Alternative proposed'];

function proposalOf(record){return record.joiningProposal||{state:'Not asked',date:record.joiningDate||'',relocation:null,proposed:[],note:''}}

function askJoiner(record,date){
record.joiningProposal={state:'Awaiting joiner',date,relocation:null,proposed:[],note:'',askedOn:record.askedOn||date};
return record.joiningProposal}

function joinerResponse(record,answer){
const proposal=proposalOf(record);
proposal.relocation=answer.relocation==='Needed'?'Needed':'Not needed';
record.relocating=proposal.relocation==='Needed';
if(answer.accepts){proposal.state='Accepted';proposal.proposed=[];record.joiningDate=proposal.date}
else{proposal.state='Alternative proposed';proposal.proposed=(answer.proposed||[]).filter(Boolean)}
proposal.note=answer.note||'';
record.joiningProposal=proposal;
return proposal}

function acceptProposedDate(record,date){
const proposal=proposalOf(record);
proposal.state='Accepted';proposal.date=date;proposal.proposed=[];
record.joiningDate=date;record.joiningProposal=proposal;
return proposal}

/* A new identifier never reuses one already held by an employee or another
   case. Agency contracts use the agency series. */
function nextEmployeeId(record,taken){
const agency=record.employmentType==='Agency contract';
const prefix=agency?'AGY-':'PSU-';
const width=agency?3:4;
const floor=agency?81:8000;
let highest=floor;
for(const id of taken||[]){
if(typeof id!=='string'||!id.startsWith(prefix))continue;
const number=parseInt(id.slice(prefix.length),10);
if(Number.isFinite(number)&&number>=highest)highest=number}
return prefix+String(highest+1).padStart(width,'0')}

const categoryOf=record=>record.employmentType==='Agency contract'?'Agency worker':record.employmentType==='Apprentice / trainee'?'Apprentice':record.employmentType==='Permanent non-executive'?'Workman':/^E/.test(record.grade||'')?'Executive':'Workman';
const employmentOf=record=>record.employmentType==='Fixed-term contract'?'Fixed-term':record.employmentType==='Agency contract'?'Agency contract':record.employmentType==='Apprentice / trainee'?'Apprentice':'Permanent';

/* ---------------------------------------------------------------------------
   Profile templates. The working pattern follows the designation and the role,
   never the person. Each template says which roles it covers, what it sets,
   and what training it carries. The first template whose match returns true,
   in this order, is the one applied; HR can apply a different one by hand.
--------------------------------------------------------------------------- */
const designationWords=record=>((record.designation||'')+' '+(record.dept||'')).toLowerCase();
const anyWord=(record,words)=>words.some(word=>designationWords(record).includes(word));

const fieldWords=['field','project','expansion','site','survey','pipeline','commissioning'];
const operationsWords=['operation','operator','utilit','maintenance','refinery','production','quality','plant','boiler','shift','technician','mechanic','welder','fitter','electrician','instrument','laboratory','chemist','process','safety'];

const profileTemplates=[
{id:'apprentice',name:'Apprentice training pattern',
covers:'Apprentices and trainees, whatever the designation',
match:record=>categoryOf(record)==='Apprentice',
shift:'General',hours:'09:00–16:30',weekly:36,off:'Saturday and Sunday',scheme:'Training attendance',
access:['Training records'],training:[{name:'Apprentice induction and workshop safety',renewal:'12 months'}]},

{id:'fixed_term_field',name:'Fixed-term field pattern',
covers:'Fixed-term and agency roles on field, project or commissioning work',
match:record=>['Fixed-term','Agency contract'].includes(employmentOf(record))&&anyWord(record,fieldWords),
shift:'Field duty',hours:'08:00–17:00',weekly:45,off:'By field roster',scheme:'Field attendance',
access:['Site access'],training:[{name:'Work-at-height and field safety',renewal:'12 months'},{name:'Contractor site induction',renewal:'12 months'}]},

{id:'field_duty',name:'Field duty pattern',
covers:'Field, project, site and commissioning roles on the permanent rolls',
match:record=>anyWord(record,fieldWords),
shift:'Field duty',hours:'08:00–17:00',weekly:45,off:'By field roster',scheme:'Field attendance',
access:['Site access'],training:[{name:'Work-at-height and field safety',renewal:'12 months'}]},

{id:'executive_general',name:'Executive general pattern',
covers:'Executive grades on general duty, including engineering and corporate roles',
match:record=>categoryOf(record)==='Executive',
shift:'General',hours:'09:00–17:30',weekly:42.5,off:'Saturday and Sunday',scheme:'General attendance',
access:['Team approvals'],training:[]},

{id:'operations_rotating',name:'Operations rotating-shift pattern',
covers:'Operations, utilities, maintenance and quality roles worked in shifts',
match:record=>anyWord(record,operationsWords),
shift:'Rotating',hours:'8 hours per shift, three shifts',weekly:42,off:'By shift roster',scheme:'Shift attendance',
access:['Shift roster'],training:[{name:'Unit-specific operations training',renewal:'24 months'}]},

{id:'general_default',name:'General pattern',
covers:'Anything the templates above do not cover',
match:()=>true,
shift:'General',hours:'09:00–17:30',weekly:42.5,off:'Saturday and Sunday',scheme:'General attendance',
access:[],training:[]}];

const templateById=id=>profileTemplates.find(t=>t.id===id);
function matchTemplate(record){return profileTemplates.find(t=>t.match(record))||profileTemplates[profileTemplates.length-1]}
/* The template HR applied by hand wins over the matched one. */
function templateFor(record){return (record.profileTemplate&&templateById(record.profileTemplate))||matchTemplate(record)}
function workPattern(record){const t=templateFor(record);return {template:t.id,templateName:t.name,shift:t.shift,hours:t.hours,weekly:t.weekly,off:t.off,scheme:t.scheme}}

function probationEnd(record){
const start=record.joiningDate;if(!start)return '';
const months=employmentOf(record)==='Permanent'?12:6;
const date=new Date(start+'T00:00:00Z');
date.setUTCMonth(date.getUTCMonth()+months);
return date.toISOString().slice(0,10)}

/* The draft a person reviews before any profile is created. */
function draftProfile(record){
const template=templateFor(record);
const category=categoryOf(record);
const employment=employmentOf(record);
const entitled=employment!=='Agency contract';
return {
id:record.employeeId||'',
name:record.name,
job:record.designation||'Not recorded',
category,
dept:record.dept||'Not recorded',
location:record.location||'Not recorded',
shift:template.shift,
grade:record.grade||'',
employment,
template:template.id,
templateName:template.name,
templateChosenByHR:!!(record.profileTemplate&&record.profileTemplate!==matchTemplate(record).id),
workHours:template.hours,
weeklyHours:template.weekly,
weeklyOff:template.off,
attendanceScheme:template.scheme,
joiningDate:record.joiningDate||'',
probationEnd:probationEnd(record),
manager:record.manager||'Not recorded',
payrollGroup:category==='Agency worker'?'Agency billing, not PSU payroll':category+' payroll, monthly',
leaveEntitlement:entitled?'PSU leave rules for '+category.toLowerCase():'Agency contract terms, no PSU leave entitlement',
access:['HRMS self-service','Attendance','Payroll documents'].concat(template.access),
training:[{name:'Safety induction',due:record.joiningDate||'',renewal:'12 months'}].concat(template.training.map(t=>({name:t.name,due:record.joiningDate||'',renewal:t.renewal}))),
source:'Drafted from onboarding case '+record.id+' using the '+template.name.toLowerCase()}}

/* ---------------------------------------------------------------------------
   The joiner's own side of the case. The joiner submits and replies; only HR
   verifies, waives or advances a stage.
--------------------------------------------------------------------------- */
const joinerKinds=['document','signature'];
function joinerTasks(record){return record.stage<3?[]:applicable(record).filter(i=>joinerKinds.includes(i.kind)&&i.stage<=record.stage)}
function joinerCanSubmit(record,itemId){
if(record.acceptance!=='Yes')return {ok:false,reason:'The offer has not been accepted yet.'};
if(!joinerTasks(record).some(i=>i.id===itemId))return {ok:false,reason:'This step is not yours to complete.'};
const current=itemState(record,itemId);
if(current==='Verified'||current==='Waived')return {ok:false,reason:'This document is already cleared.'};
return {ok:true}}
function joinerAwaitingAnswer(record){return record.stage>=2&&proposalOf(record).state==='Awaiting joiner'}
function joinerOutstanding(record){return joinerTasks(record).filter(i=>!['Verified','Waived','Submitted'].includes(itemState(record,i.id))||itemState(record,i.id)==='Failed')}

/* ---------------------------------------------------------------------------
   What the candidate is sent, what they accept, and the three workflows that
   run once they submit. Pay bands, allowances and the mail text are
   illustrative demonstration values, not NRL terms.
--------------------------------------------------------------------------- */
const offerTerms=[
'The appointment is subject to medical fitness, document verification and any statutory clearance that applies to the post.',
'Pay, allowances and benefits follow the pay band of the grade offered and the rules in force at the time of payment.',
'The joining date is the date agreed in writing with HR. Reporting later than that date needs written approval.',
'Company property, access cards and systems are issued for official use and returned when service ends.',
'Confidentiality, intellectual-property and conduct rules apply from the joining date.'];

const payBands={
E1:{band:'E1',basic:62000,hra:0.24,da:0.46},
E2:{band:'E2',basic:74000,hra:0.24,da:0.46},
E3:{band:'E3',basic:88000,hra:0.27,da:0.46},
NE3:{band:'NE3',basic:38000,hra:0.2,da:0.46},
NE4:{band:'NE4',basic:43000,hra:0.2,da:0.46},
A1:{band:'A1',basic:19000,hra:0.16,da:0.3}};
const defaultBand={band:'Unbanded',basic:45000,hra:0.2,da:0.4};
const rupees=n=>'₹'+Math.round(n).toLocaleString('en-IN');

/* Finance workflow: the compensation the HR compensation portal would carry. */
function compensation(record){
const band=payBands[(record.grade||'').toUpperCase()]||defaultBand;
const agency=employmentOf(record)==='Agency contract';
const basic=band.basic;
const da=Math.round(basic*band.da);
const hra=Math.round(basic*band.hra);
const pattern=templateFor(record);
const shiftAllowance=pattern.shift==='Rotating'?3200:pattern.shift==='Field duty'?4200:0;
const conveyance=agency?0:2400;
const gross=basic+da+hra+shiftAllowance+conveyance;
const pf=agency?0:Math.round(basic*0.12);
const gratuity=agency?0:Math.round(basic*0.0481);
return {band:band.band,
basic,dearness:da,houseRent:hra,shiftAllowance,conveyance,
gross,employerPf:pf,gratuity,
annual:(gross+pf+gratuity)*12,
payrollGroup:agency?'Agency billing, not PSU payroll':categoryOf(record)+' payroll, monthly',
note:agency?'Agency contract: billed through the agency, no PSU pay structure applies.':'Illustrative band values for the demonstration, not NRL pay rules.',
lines:[['Basic pay',basic],['Dearness allowance',da],['House rent allowance',hra]]
.concat(shiftAllowance?[['Shift allowance',shiftAllowance]]:[])
.concat(conveyance?[['Conveyance',conveyance]]:[])}}

const stepIcons={
travel:'<path d="M10.2 3.3 8.7 3l-3 5.1-3.3-.6a1 1 0 0 0-1 1.5l2.4 3.4-1 1.8 1.4.6 1.5-1.4 4 1 .7-1.5-2.7-2.6 3.5-6z" transform="translate(4 4) scale(0.95)"/>',
accommodation:'<path d="M4 18v-7m0 7h16v-5a3 3 0 0 0-3-3H4m0-4v4"/><circle cx="8" cy="11" r="1.6"/>',
goods:'<path d="M4 8.5 12 5l8 3.5v7L12 19l-8-3.5z"/><path d="M4 8.5 12 12l8-3.5M12 12v7"/>',
local:'<path d="M5 16h14M6.5 16V9.8L8 6.5h8l1.5 3.3V16"/><circle cx="8.3" cy="16.6" r="1.4"/><circle cx="15.7" cy="16.6" r="1.4"/>',
bank:'<path d="M4 9.5 12 5l8 4.5M5.5 10v7M10 10v7M14 10v7M18.5 10v7M4 19.5h16"/>',
identity:'<circle cx="12" cy="9" r="3.2"/><path d="M5.5 19c.9-3 3.4-4.6 6.5-4.6s5.6 1.6 6.5 4.6"/>',
mail:'<rect x="3.5" y="6" width="17" height="12" rx="2"/><path d="m4.5 7.5 7.5 5.5 7.5-5.5"/>',
pattern:'<circle cx="12" cy="12" r="7.5"/><path d="M12 7.5V12l3 2"/>',
profile:'<path d="M6 3.5h8l4 4V20a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 20z"/><path d="M14 3.5V8h4M9 13h6M9 16.5h4"/>',
pan:'<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M7 10h4M7 13.5h7"/>',
aadhaar:'<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 15.5c.6-1.3 1.7-2 3-2s2.4.7 3 2M15 10h3M15 13h3"/>'};
const stepIcon=id=>`<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${stepIcons[id]||'<circle cx="12" cy="12" r="8"/>'}</svg>`;
const tickIcon='<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>';

/* Finance workflow: identity and bank verification gate the compensation. */
const financeChecks=[
{id:'bank',name:'Bank account verification',document:'d_bank'},
{id:'pan',name:'PAN verification',document:'d_tax'},
{id:'aadhaar',name:'Aadhaar verification',document:'d_identity'}];
const financeCleared=run=>!!run&&(run.state==='Released'||((run.output.checks||[]).length>0&&(run.output.checks||[]).every(c=>((run.output.checkStates||{})[c.id]||{}).state==='Verified')));

/* Logistics workflow: only has work to do when relocation was asked for. */
function logistics(record){
if(!record.relocating)return {needed:false,tasks:[]};
const to=record.location||'the work location';
return {needed:true,tasks:[
{id:'travel',name:'Travel to '+to},
{id:'accommodation',name:'Transit accommodation'},
{id:'goods',name:'Household goods movement'},
{id:'local',name:'Local transport and reporting'}]}}

/* Company address, never clashing with one already issued. */
function companyEmail(record,taken){
const parts=String(record.name||'').toLowerCase().normalize('NFKD').replace(/[^a-z\s]/g,'').trim().split(/\s+/).filter(Boolean);
const base=(parts.slice(0,2).join('.')||'employee');
let address=base+'@nrl.example.invalid',n=1;
const used=new Set((taken||[]).map(a=>String(a).toLowerCase()));
while(used.has(address.toLowerCase())){n++;address=base+n+'@nrl.example.invalid'}
return address}

const workflowNames={finance:'Finance · compensation setup',logistics:'Logistics · relocation',hr:'HR · employee record'};

/* The joiner has sent everything that is theirs to send. */
function joinerComplete(record){
const tasks=joinerTasks(record);
if(!tasks.length)return false;
if(proposalOf(record).state==='Not asked'||proposalOf(record).state==='Awaiting joiner')return false;
return tasks.every(i=>['Submitted','Verified','Waived'].includes(itemState(record,i.id)))}

/* Mail the demonstration shows in place of a real message. */
function composeNotice(record,kind){
const name=(record.name||'').split(' ')[0]||'there';
if(kind==='offer')return {kind,subject:'Your offer from NRL',
body:'Dear '+name+', your offer for '+(record.designation||'the role')+' is attached in the joining portal. Please read the terms, accept or decline the offer, and confirm. The document checklist opens once you accept.'};
if(kind==='documents')return {kind,subject:'Your onboarding checklist is open',
body:'Dear '+name+', thank you for accepting. Please complete your profile in the joining portal: identity, education, bank, tax and statutory details, your joining date and whether you need relocation support.'};
if(kind==='submitted')return {kind,subject:'We have received your documents',
body:'Dear '+name+', your documents are with HR. Finance, logistics and HR record setup have started. We will write again when your HRMS access is ready.'};
if(kind==='ready')return {kind,subject:'Your NRL HRMS access is ready',
body:'Dear '+name+', your employee record is live. Employee ID '+(record.employeeId||'')+', work email '+(record.companyEmail||'')+'. Sign in to the HRMS portal with your employee ID to see your joining date, joining location and your first-week guidance.'};
return {kind,subject:'Update on your onboarding',body:'Dear '+name+', there is an update on your onboarding.'}}

/* The three workflows the submission triggers. Each produces a draft for HR
   to release; nothing is paid, booked or activated by the run itself. */
function runWorkflows(record,context){
const taken=(context&&context.emails)||[];
const ids=(context&&context.ids)||[];
const stamp=(context&&context.stamp)||'';
if(!record.employeeId)record.employeeId=nextEmployeeId(record,ids);
if(!record.companyEmail)record.companyEmail=companyEmail(record,taken);
const runs=record.workflows||(record.workflows={});
runs.finance=runs.finance||{state:'Drafted',ranOn:stamp,output:Object.assign(compensation(record),{checks:financeChecks,checkStates:{}})};
const plan=logistics(record);
runs.logistics=runs.logistics||{state:plan.needed?'Drafted':'Not required',ranOn:stamp,output:plan};
runs.hr=runs.hr||{state:'Drafted',ranOn:stamp,output:Object.assign(draftProfile(record),{companyEmail:record.companyEmail})};
return runs}

const workflowStates=record=>Object.entries(record.workflows||{}).map(([id,run])=>({id,name:workflowNames[id],state:run.state}));
const workflowsSettled=record=>{const runs=record.workflows;if(!runs)return false;
return Object.values(runs).every(run=>['Released','Not required'].includes(run.state))};
const accessReleased=record=>!!record.accessReleasedOn;

function ensureRecord(record){
if(!record.stage)record.stage=1;
/* Cases stored before the joining confirmation existed settled it off-system. */
if(record.stage>=4&&!record.joiningProposal){
record.joiningProposal={state:'Accepted',date:record.joiningDate||'',relocation:record.relocating?'Needed':'Not needed',proposed:[],note:''};
record.items=record.items||{};
for(const id of ['k_relocation','k_joindate'])if(!record.items[id])record.items[id]={state:'Verified',note:'Settled before this step was recorded in the case'};
}
if(!record.items)record.items={};
if(!record.history)record.history=[];
if(record.screening===undefined)record.screening=true;
if(record.acceptance===undefined)record.acceptance=null;
/* A finance run drafted before the checks existed gets them now, so the
   compensation is not locked behind a board with nothing on it. */
if(record.workflows&&record.workflows.finance&&record.workflows.finance.output&&!record.workflows.finance.output.checks){
record.workflows.finance.output.checks=financeChecks;
record.workflows.finance.output.checkStates=record.workflows.finance.output.checkStates||{}}
if(!record.portalToken)record.portalToken=(globalThis.crypto&&crypto.randomUUID?crypto.randomUUID().slice(0,8):String(Math.random()).slice(2,10));
return record}

/* ---------------------------------------------------------------------------
   Sample joiners. Fictional people, not NRL employees, used so the HR screens
   show a realistic spread of stages, exceptions and hard blocks.
--------------------------------------------------------------------------- */
const coordinators=['Priya Nair','Dipankar Saikia'];
function fill(record,upto,overrides){
for(const item of applicable(record))if(item.stage<=upto)record.items[item.id]={state:'Verified',by:record.coordinator,date:record.started};
for(const id in overrides||{})record.items[id]=Object.assign({by:record.coordinator,date:record.started},overrides[id]);
return record}

function sample(n,fields,upto,overrides,story){
const record=ensureRecord(Object.assign({id:'ONB-2026-'+String(n).padStart(4,'0'),by:coordinators[n%2],coordinator:coordinators[n%2],
started:'28/10/2026, 10:12 am',stage:1,acceptance:null,items:{},history:[],screening:true,experienced:true,
grade:'E2',dept:'Refinery operations',location:'Numaligarh refinery',employmentType:'Permanent executive',
offerRef:'OFR-2026-'+String(n).padStart(4,'0'),offerDate:'2026-10-20',manager:'Rajesh Kumar',
address:'Golaghat district, Assam',needsInfo:false,sample:true},fields));
fill(record,upto===undefined?record.stage:upto,overrides);
record.history=(story||[]).map(([date,action])=>({date,action,by:record.coordinator}));
/* At pre-joining the confirmation is still open, so it can be demonstrated. */
if(record.stage===3&&!record.joiningProposal)for(const id of ['k_relocation','k_joindate'])delete record.items[id];
/* Later stages already settled the joining confirmation and hold an identifier. */
if(record.stage>=4){
record.joiningProposal={state:'Accepted',date:record.joiningDate,relocation:record.relocating?'Needed':'Not needed',proposed:[],note:''};
record.employeeId=record.employeeId||(record.employmentType==='Agency contract'?'AGY-':'PSU-')+(record.employmentType==='Agency contract'?String(81+n):String(8300+n));
}
return record}

function samples(){return [
sample(1,{name:'Aditi Roy',designation:'Process Engineer',dept:'Process engineering',email:'aditi.roy@example.invalid',phone:'+91 90000 10001',dob:'1998-04-02',joiningDate:'2026-12-01',stage:3,acceptance:'Yes',relocating:true},3,
{d_education:{state:'Failed',note:'Marksheet is illegible',thread:[{date:'29/10/2026, 4:02 pm',by:'Priya Nair',text:'Did you upload the wrong document?'},{date:'29/10/2026, 5:10 pm',by:'Aditi Roy',text:'Yes, I will upload the correct marksheet today.'}]},
b_qualification:{state:'Submitted',note:'College verification is running'}},
[['29/10/2026, 5:10 pm','Question or reply recorded on Education certificates by Aditi Roy'],['29/10/2026, 4:02 pm','Education certificates set to Failed · Marksheet is illegible'],['27/10/2026, 11:20 am','Stage advanced to Pre-joining in progress'],['26/10/2026, 9:40 am','Offer accepted. Joining date confirmed. Portal link for documents sent to the joiner.'],['20/10/2026, 10:12 am','Offer issued. Offer email sent to the joiner with one link.']]),

sample(2,{name:'Rohan Sen',designation:'Shift Technician',grade:'NE4',employmentType:'Permanent non-executive',email:'rohan.sen@example.invalid',phone:'+91 90000 10002',dob:'1996-11-19',joiningDate:'2026-10-26',stage:6,acceptance:'Yes'},6,
{a_access:{state:'Pending',note:'Locker and physical access pending with administration'}},
[['28/10/2026, 9:05 am','Stage advanced to Active employee · Gate pass issued'],['26/10/2026, 8:30 am','Stage advanced to Reported for joining'],['24/10/2026, 3:15 pm','Stage advanced to Ready to join'],['20/10/2026, 10:12 am','Offer issued. Offer email sent to the joiner with one link.']]),

sample(3,{name:'Ananya Baruah',designation:'Instrumentation Engineer',grade:'E1',dept:'Instrumentation',email:'ananya.baruah@example.invalid',phone:'+91 90000 10003',dob:'2000-01-23',joiningDate:'2026-12-15',stage:1,started:'30/10/2026, 11:02 am',offerDate:'2026-10-30'},1,null,
[['30/10/2026, 11:02 am','Offer issued. Offer email sent to the joiner with one link. No document portal link sent yet.']]),

sample(4,{name:'Imran Hussain',designation:'Safety Officer',grade:'E3',dept:'Health, safety and environment',email:'imran.hussain@example.invalid',phone:'+91 90000 10004',dob:'1991-07-08',joiningDate:'2026-12-08',stage:2,acceptance:'Yes',licence:true},2,null,
[['30/10/2026, 10:40 am','Offer accepted. Joining date confirmed. Portal link for documents sent to the joiner.'],['24/10/2026, 10:12 am','Offer issued. Offer email sent to the joiner with one link.']]),

sample(5,{name:'Priyanka Das',designation:'Finance Analyst',dept:'Finance and accounts',email:'priyanka.das@example.invalid',phone:'+91 90000 10005',dob:'1997-03-14',joiningDate:'2026-11-17',stage:4,acceptance:'Yes'},4,null,
[['29/10/2026, 2:20 pm','Stage advanced to Ready to join · Equipment and IT access prepared'],['22/10/2026, 10:05 am','Stage advanced to Pre-joining in progress'],['21/10/2026, 4:50 pm','Offer accepted. Joining date confirmed.'],['18/10/2026, 10:12 am','Offer issued. Offer email sent to the joiner with one link.']]),

sample(6,{name:'Bikash Gogoi',designation:'Boiler Operator',grade:'NE3',dept:'Utilities',employmentType:'Permanent non-executive',email:'bikash.gogoi@example.invalid',phone:'+91 90000 10006',dob:'1994-09-30',joiningDate:'2026-10-29',stage:5,acceptance:'Yes'},4,
{j_reported:{state:'Verified',note:'Reported at 08:45 on 29 October 2026'},j_identity:{state:'Verified'},j_originals:{state:'Submitted',note:'Two originals still to be checked by establishment'},s_policy:{state:'Pending'}},
[['29/10/2026, 9:10 am','Stage advanced to Reported for joining · Joining time recorded'],['27/10/2026, 11:55 am','Stage advanced to Ready to join'],['20/10/2026, 10:12 am','Offer issued. Offer email sent to the joiner with one link.']]),

sample(7,{name:'Meghna Kalita',designation:'HR Executive',grade:'E1',dept:'Human resources',email:'meghna.kalita@example.invalid',phone:'+91 90000 10007',dob:'1999-06-11',joiningDate:'2026-10-19',stage:7,acceptance:'Yes'},6,
{i_induction:{state:'Verified'},i_team:{state:'Verified'},i_buddy:{state:'Submitted',note:'Buddy check scheduled for the second week'},i_training:{state:'Pending',note:'Unit training calendar awaited'},i_roster:{state:'Pending'}},
[['28/10/2026, 10:00 am','Stage advanced to Induction and role onboarding'],['21/10/2026, 9:15 am','Stage advanced to Active employee'],['19/10/2026, 8:40 am','Stage advanced to Reported for joining'],['12/10/2026, 10:12 am','Offer issued. Offer email sent to the joiner with one link.']]),

sample(8,{name:'Tarun Phukan',designation:'Electrical Technician',grade:'NE4',dept:'Electrical maintenance',employmentType:'Permanent non-executive',email:'tarun.phukan@example.invalid',phone:'+91 90000 10008',dob:'1993-02-27',joiningDate:'2026-09-28',stage:8,acceptance:'Yes'},8,null,
[['27/10/2026, 5:30 pm','Stage advanced to Onboarding complete · Training and benefit enrollment closed'],['14/10/2026, 10:20 am','Stage advanced to Induction and role onboarding'],['30/09/2026, 9:05 am','Stage advanced to Active employee'],['20/09/2026, 10:12 am','Offer issued. Offer email sent to the joiner with one link.']]),

sample(9,{name:'Sanjay Mahanta',designation:'Contract Welder',grade:'Agency',dept:'Expansion project',employmentType:'Agency contract',email:'sanjay.mahanta@example.invalid',phone:'+91 90000 10009',dob:'1990-12-05',joiningDate:'2026-11-10',stage:3,acceptance:'Yes',screening:false},3,
{c_medical:{state:'Failed',note:'Medical fitness certificate expired. Re-examination booked for 5 November 2026.'}},
[['29/10/2026, 3:45 pm','Medical fitness set to Failed · Medical fitness certificate expired. Re-examination booked for 5 November 2026.'],['25/10/2026, 10:30 am','Stage advanced to Pre-joining in progress'],['21/10/2026, 10:12 am','Offer issued. Offer email sent to the joiner with one link.']]),

sample(10,{name:'Farhana Ahmed',designation:'Graduate Engineer Trainee',grade:'E1',dept:'Process engineering',employmentType:'Apprentice / trainee',email:'farhana.ahmed@example.invalid',phone:'+91 90000 10010',dob:'2002-08-17',joiningDate:'2026-11-24',stage:3,acceptance:'Yes',experienced:false,workAuth:true,relocating:true},3,
{d_work_auth:{state:'Submitted',note:'Work authorisation document under verification'},d_bank:{state:'Pending'},d_nominee:{state:'Pending'}},
[['30/10/2026, 12:15 pm','Work authorisation set to Submitted · Work authorisation document under verification'],['28/10/2026, 10:45 am','Stage advanced to Pre-joining in progress'],['23/10/2026, 10:12 am','Offer issued. Offer email sent to the joiner with one link.']]),

sample(11,{name:'Deepak Boro',designation:'Laboratory Chemist',dept:'Quality control',email:'deepak.boro@example.invalid',phone:'+91 90000 10011',dob:'1995-05-21',joiningDate:'2026-12-22',stage:1,acceptance:'No',started:'26/10/2026, 4:05 pm'},1,null,
[['29/10/2026, 6:20 pm','Offer declined by the joiner. Case stopped; onboarding does not start.'],['26/10/2026, 4:05 pm','Offer issued. Offer email sent to the joiner with one link.']]),

sample(12,{name:'Nabanita Devi',designation:'Procurement Officer',dept:'Materials and procurement',email:'nabanita.devi@example.invalid',phone:'+91 90000 10012',dob:'1996-10-09',joiningDate:'2026-11-30',stage:3,acceptance:'Yes',security:true},3,
{c_security:{state:'Verified',note:'Security clearance received from the competent authority'}},
[['30/10/2026, 4:40 pm','All documents and checks verified. Awaiting the joiner confirmation.'],['30/10/2026, 9:30 am','Stage advanced to Pre-joining in progress'],['28/10/2026, 2:10 pm','Offer accepted. Joining date confirmed.'],['22/10/2026, 10:12 am','Offer issued. Offer email sent to the joiner with one link.']])]}

/* An AI pattern replaces the template's pattern fields and nothing else:
   pay, identifiers, probation and entitlement stay with the rules. */
function applyPattern(draft,pattern){
if(!draft||!pattern)return draft;
const merged=Object.assign({},draft,{
shift:pattern.shift,workHours:pattern.workHours,weeklyHours:pattern.weeklyHours,
weeklyOff:pattern.weeklyOff,attendanceScheme:pattern.attendanceScheme,
access:['HRMS self-service','Attendance','Payroll documents'].concat(pattern.access||[]).filter((v,i,a)=>a.indexOf(v)===i),
training:[{name:'Safety induction',due:draft.joiningDate||'',renewal:'12 months'}].concat((pattern.training||[]).map(t=>({name:t.name,due:draft.joiningDate||'',renewal:t.renewal}))),
templateName:'Drafted by the profile agent',
template:'ai',
drafter:'agent',
rationale:pattern.rationale||'',
model:pattern.model||''});
return merged}

const model={stages,financeChecks,financeCleared,checklist,groups,states,employmentTypes,proposalStates,applicable,itemState,summary,canAdvance,samples,applyPattern,proposalOf,askJoiner,joinerResponse,acceptProposedDate,joinerTasks,offerTerms,payBands,compensation,logistics,companyEmail,joinerComplete,composeNotice,workflowNames,rupees,runWorkflows,workflowStates,workflowsSettled,accessReleased,joinerCanSubmit,joinerAwaitingAnswer,joinerOutstanding,nextEmployeeId,draftProfile,workPattern,profileTemplates,matchTemplate,templateFor,parse};
if(typeof module!=='undefined')module.exports=Object.assign({parse},model);
if(!global.document)return;
global.Onboarding=model;

/* ---------------------------------------------------------------------------
   HR interface. HR officer only. Fictional data, saved in this browser.
--------------------------------------------------------------------------- */
let preview=[],fileName='',reading=0;
const caseModal=(title,body,foot,wide)=>{modal(title,body,foot);const d=$('#dialog');d.classList.add('onb-buttons');if(wide)d.classList.add('onb-dialog')};

const permitted=()=>role==='HR officer'&&!signedOut;
/* A run abandoned by a reload or a stalled call must not block the next one. */
const agentBusy=agent=>{
if(!agent||agent.state!=='Running')return false;
const started=Date.parse(agent.startedAt||0);
return Number.isFinite(started)&&Date.now()-started<120000};

/* Demonstration setting: a document the joiner sends is verified straight
   away, so a case can be walked forward without HR checking each row. Turn it
   off to see the real rule, where sending and verifying are separate acts. */
const autoVerify=()=>state.autoVerify!==false;
global.onboardingAutoVerify=function(){if(!permitted())return;
state.autoVerify=!autoVerify();
try{audit('Automatic verification of joiner documents turned '+(autoVerify()?'on':'off'));save()}catch{}
render();toast(autoVerify()?'Documents the joiner sends are verified automatically.':'Documents the joiner sends now wait for HR to verify them.')};
const now=()=>new Date().toLocaleString('en-IN',{timeZone:'Asia/Kolkata'});
const today=()=>new Date().toISOString().slice(0,10);
const tone=s=>['Ready','Complete','Verified'].includes(s)?'ok':['Blocked','Failed','Stopped'].includes(s)?'bad':['Pending follow-up','Submitted','Waived','Awaiting acceptance'].includes(s)?'info':'warn';
const chip=(text,cls)=>`<span class="badge ${cls}">${esc(text)}</span>`;
const stageName=n=>(stages[n-1]||stages[0]).name;
const caseRef=id=>id.length<=16?id:id.slice(0,10);
const records=()=>(state.onboarding||[]).map(ensure);
const find=id=>records().find(r=>r.id===id);
const val=id=>($('#'+id)?.value||'').trim();
const checked=id=>!!$('#'+id)?.checked;

const ensure=ensureRecord;

/* Sample joiners are seeded once, so the HR screens are not empty on a first
   visit or after a demonstration reset. They can be removed or reloaded. */
function seedSamples(){if(state.onboarding)return false;
state.onboarding=samples();
/* The completed sample joiner already has a profile in the directory. */
const complete=state.onboarding.find(r=>r.stage===8);
if(complete){const profile=draftProfile(complete);profile.createdOn='27/10/2026, 5:30 pm';profile.createdBy=complete.coordinator;profile.case=complete.id;complete.profile=profile;state.hrmsProfiles=[profile]}
if(typeof syncPeople==='function')syncPeople();
try{save()}catch{}return true}

function log(record,action){record.history.unshift({date:now(),action,by:person().name})}

function persist(action,undo){
try{audit(action);save()}catch(e){undo();state.audit.pop();toast('Unable to save. Browser storage may be full.');return false}
return true}

/* ---------- case list ---------- */
global.onboardingSection=function(){if(!permitted())return '';
if(!state.onboarding)state.onboarding=[];
const all=records(),view=state.onboardingView||'Exceptions';
const rows=all.map(r=>({r,s:summary(r)}));
const month=new Date().toISOString().slice(0,7);
const metrics=[
['Offers out',rows.filter(x=>x.r.stage===1&&x.r.acceptance!=='No').length,'Awaiting acceptance'],
['Accepted',rows.filter(x=>x.r.acceptance==='Yes').length,'Onboarding started'],
['Joining this month',rows.filter(x=>(x.r.joiningDate||'').slice(0,7)===month&&x.r.stage<6).length,'Confirmed joining dates'],
['Ready',rows.filter(x=>x.s.status==='Ready'&&x.r.stage>=4).length,'Nothing outstanding'],
['Blocked',rows.filter(x=>x.s.status==='Blocked').length,'Needs an HR decision'],
['Pending follow-up',rows.filter(x=>x.s.status==='Pending follow-up').length,'Active with open items']];
const filtered=view==='Exceptions'?rows.filter(x=>['Blocked','Pending follow-up','Stopped'].includes(x.s.status)):view==='Open'?rows.filter(x=>!['Complete','Stopped'].includes(x.s.status)):rows;
const tabs=['Exceptions','Open','All'].map(v=>`<button class="${v===view?'primary':''}" onclick="onboardingView('${v}')">${v}</button>`).join('');
return card('Employee onboarding',`
<div class="onboard-intro"><div><span class="eyebrow">HR INTAKE</span><h3>From offer to active employee, in one chain.</h3><p>One onboarding case, one checklist. HR sees only exceptions by default. A person approves every step; nothing is paid, approved, or sent by the system alone.</p></div><div class="actions">${btn('Upload employee list',"onboardingUpload()",'primary')}</div></div>
<div class="onboard-note">Cases start from an uploaded employee list. Eight stages: offer issued · offer accepted · pre-joining · ready to join · reported for joining · active employee · induction · onboarding complete. Records are saved in this browser. Use sample names in this demo.</div>
<div class="onb-metrics">${metrics.map(([label,value,note])=>`<div class="stat"><div class="stathead">${label}<span>→</span></div><strong>${value}</strong><small>${note}</small></div>`).join('')}</div>
<div class="toolbar">${tabs}${btn('Export cases (CSV)',"onboardingExport()")}${btn('Auto-verify: '+(autoVerify()?'on':'off'),"onboardingAutoVerify()")}${all.some(r=>r.batch)?btn('Remove uploaded cases ('+all.filter(r=>r.batch).length+')',"onboardingRemoveUploaded()"):''}${all.some(r=>r.sample)?btn('Remove sample joiners ('+all.filter(r=>r.sample).length+')',"onboardingRemoveSamples()"):btn('Load sample joiners',"onboardingReseedConfirm()")}${btn('Download CSV template',"onboardingTemplate()")}</div>
${filtered.length?`<div class="tablewrap"><table><thead><tr><th>EMPLOYEE</th><th>CASE</th><th>STAGE</th><th>STATUS</th><th>WHAT IS MISSING</th><th>OWNER</th><th></th></tr></thead><tbody>${filtered.map(({r,s})=>`<tr><td><strong data-i18n-user>${esc(r.name)}</strong><br><small>${esc(r.designation||'Designation not recorded')}</small></td><td>${esc(caseRef(r.id))}<br><small>${r.joiningDate?'Joining '+esc(r.joiningDate):'Joining date not set'}</small></td><td>${r.stage}/8 · ${esc(stageName(r.stage))}</td><td>${chip(s.status,tone(s.status))}</td><td><small>${esc(s.reason||'Nothing outstanding')}</small></td><td><small data-i18n-user>${esc(r.coordinator||r.by||'Unassigned')}</small></td><td>${btn('Open →',`onboardingDetail('${r.id}','overview')`,'link')}</td></tr>`).join('')}</tbody></table></div>`:`<div class="empty">${all.length?'No cases in this view. Switch to All to see every case.':'No onboarding cases yet. Upload an employee list, or load the sample joiners.'}</div>`}
<div class="cardfoot">${all.length} onboarding cases · ${rows.filter(x=>x.s.status==='Blocked').length} blocked · Every question, reply and upload is logged with date and owner.</div>`)};

global.onboardingTemplate=function(){
const header=['Employee Name','Designation','Grade','Department','Work Location','Employment Type','Joining Date','Offer Reference','Offer Date','Personal Email','Mobile','Date of Birth','Address','Reporting Manager','Has Previous Employment','Background Checks','Work Authorisation','Professional Licence','Security Clearance','Relocation'];
const example=['Aditi Roy','Process Engineer','E2','Process engineering','Numaligarh refinery','Permanent executive','2027-01-05','OFR-2027-0001',today(),'aditi.roy@example.invalid','+91 90000 00001','1998-04-02','Golaghat district, Assam','Rajesh Kumar','Yes','Yes','No','No','No','No'];
download('onboarding-template.csv',[header,example].map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n')+'\n')};

global.onboardingView=function(v){if(!permitted())return;state.onboardingView=v;render()};

/* Cases created from an uploaded list, removed together. */
global.onboardingRemoveUploaded=function(){if(!permitted())return;
const uploaded=records().filter(r=>r.batch);
if(!uploaded.length)return toast('No uploaded cases to remove.');
const withProfile=uploaded.filter(r=>r.profile);
const removable=uploaded.filter(r=>!r.profile);
const started=removable.filter(r=>r.stage>1||r.acceptance);
modal('Remove uploaded cases',`<p>This permanently removes ${removable.length} onboarding case(s) created from an uploaded employee list. This cannot be undone.</p>
<div class="tablewrap" style="max-height:220px;overflow:auto"><table><thead><tr><th>EMPLOYEE</th><th>CASE</th><th>STAGE</th></tr></thead><tbody>${removable.map(r=>`<tr><td data-i18n-user>${esc(r.name)}</td><td>${esc(r.id)}</td><td>${r.stage}/8</td></tr>`).join('')}</tbody></table></div>
${started.length?`<div class="callout">${started.length} of these have moved past Offer issued. Their documents, answers and history go with them.</div>`:''}
${withProfile.length?`<div class="callout">${withProfile.length} uploaded case(s) already have an employee profile and are kept. Remove those from People &amp; Service Records if they should not exist.</div>`:''}
<p class="sub">The sample joiners are not touched.</p>`,
btn('Cancel',"$('#dialog').close()")+btn('Remove '+removable.length+' case(s)',"onboardingRemoveUploadedConfirm()",'primary'))};

global.onboardingRemoveUploadedConfirm=function(){if(!permitted())return;
const previous=structuredClone(state.onboarding||[]);
const removed=records().filter(r=>r.batch&&!r.profile).length;
if(!removed)return;
state.onboarding=(state.onboarding||[]).filter(r=>!(r.batch&&!r.profile));
if(!persist('Uploaded onboarding cases removed: '+removed,()=>{state.onboarding=previous}))return;
$('#dialog').close();render();toast(removed+' uploaded case(s) removed.')};

global.onboardingRemoveSamples=function(){if(!permitted())return;
const samplesHere=records().filter(r=>r.sample);
if(!samplesHere.length)return toast('No sample joiners to remove.');
const withProfile=samplesHere.filter(r=>r.profile);
modal('Remove sample joiners',`<p>This permanently removes ${samplesHere.length} fictional sample case(s) from this browser. This cannot be undone, although Load sample joiners brings fresh copies back.</p>
${withProfile.length?`<div class="callout">${withProfile.length} of them also have a sample employee profile in People &amp; Service Records. That profile is removed with its case, so neither is left on its own.</div>`:''}
<p class="sub">Cases created from an uploaded list are not touched.</p>`,
btn('Cancel',"$('#dialog').close()")+btn('Remove '+samplesHere.length+' case(s)',"onboardingRemoveSamplesConfirm()",'primary'))};

global.onboardingRemoveSamplesConfirm=function(){if(!permitted())return;
const previous=structuredClone(state.onboarding||[]),previousProfiles=structuredClone(state.hrmsProfiles||[]);
const going=records().filter(r=>r.sample);
if(!going.length)return;
const cases=new Set(going.map(r=>r.id));
state.onboarding=(state.onboarding||[]).filter(r=>!r.sample);
state.hrmsProfiles=(state.hrmsProfiles||[]).filter(p=>!cases.has(p.case));
if(typeof syncPeople==='function')syncPeople();
if(!persist('Sample onboarding cases removed: '+going.length,()=>{state.onboarding=previous;state.hrmsProfiles=previousProfiles}))return;
$('#dialog').close();render();toast(going.length+' sample case(s) removed.')};

global.onboardingReseed=function(){if(!permitted())return;
const own=records().filter(r=>!r.sample).length;
caseModal('Reload sample joiners',`<p>This replaces the twelve fictional sample cases with fresh copies, so the screens show the original spread of stages and exceptions.</p><p class="sub">${own?own+' case(s) you created here are kept and are not changed.':'No cases created here, so nothing of your own is affected.'} Changes made to the sample cases in this browser are discarded.</p>`,
btn('Cancel',"$('#dialog').close()")+btn('Reload samples',"onboardingReseedConfirm()",'primary'))};

global.onboardingReseedConfirm=function(){if(!permitted())return;
const previous=state.onboarding||[];
const fresh=samples();
state.onboarding=[...(previous||[]).filter(r=>!r.sample),...fresh];
const complete=fresh.find(r=>r.stage===8);
if(complete&&!(state.hrmsProfiles||[]).some(p=>p.case===complete.id)){const profile=draftProfile(complete);profile.createdOn='27/10/2026, 5:30 pm';profile.createdBy=complete.coordinator;profile.case=complete.id;complete.profile=profile;state.hrmsProfiles=[...(state.hrmsProfiles||[]),profile];if(typeof syncPeople==='function')syncPeople()}
if(!persist('Sample onboarding cases reloaded',()=>{state.onboarding=previous}))return;
$('#dialog').close();render();toast('Sample joiners reloaded.')};

global.onboardingExport=function(){if(!permitted())return;
const rows=records().map(r=>{const s=summary(r);return [r.id,r.name,r.designation||'',r.employmentType||'',r.joiningDate||'',r.stage+'/8',stageName(r.stage),s.status,s.missing.join('; '),r.coordinator||'']});
download('onboarding-cases.csv',[['Case ID','Employee','Designation','Employment type','Joining date','Stage','Stage name','Status','Outstanding','Coordinator'],...rows].map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\n'))};

/* ---------- new employee information ---------- */
const flagRow=(id,label,on)=>`<label class="onb-flag"><input type="checkbox" id="${id}" ${on?'checked':''}><span>${label}</span></label>`;

global.onboardingNew=function(existingId){if(!permitted())return;
const r=existingId?find(existingId):null;
modal('Employee information',`
<p class="sub">Fictional demonstration data only. No record is sent to SAP, payroll, or any gate system.</p>
<h3>Personal information</h3>
<div class="formgrid">
<label class="field">Full name<input id="onbName" maxlength="120" value="${esc(r?.name||'')}" placeholder="e.g. Aditi Roy"></label>
<label class="field">Date of birth<input id="onbDob" type="date" value="${esc(r?.dob||'')}"></label>
<label class="field">Personal email<input id="onbEmail" type="email" maxlength="120" value="${esc(r?.email||'')}" placeholder="name@example.invalid"></label>
<label class="field">Mobile number<input id="onbPhone" maxlength="20" value="${esc(r?.phone||'')}" placeholder="+91 ..."></label>
<label class="field full">Correspondence address<input id="onbAddress" maxlength="200" value="${esc(r?.address||'')}"></label>
</div>
<h3>Offer and position</h3>
<div class="formgrid">
<label class="field">Offer reference<input id="onbOffer" maxlength="40" value="${esc(r?.offerRef||'')}" placeholder="OFR-2026-0001"></label>
<label class="field">Offer date<input id="onbOfferDate" type="date" value="${esc(r?.offerDate||today())}"></label>
<label class="field">Designation<input id="onbDesignation" maxlength="80" value="${esc(r?.designation||'')}" placeholder="e.g. Process Engineer"></label>
<label class="field">Grade<input id="onbGrade" maxlength="20" value="${esc(r?.grade||'')}" placeholder="e.g. E2"></label>
<label class="field">Department / unit<input id="onbDept" maxlength="80" value="${esc(r?.dept||'')}" placeholder="e.g. Refinery operations"></label>
<label class="field">Work location<input id="onbLocation" maxlength="80" value="${esc(r?.location||'')}" placeholder="e.g. Numaligarh refinery"></label>
<label class="field">Employment type<select id="onbType">${employmentTypes.map(t=>`<option ${t===(r?.employmentType||employmentTypes[0])?'selected':''}>${t}</option>`).join('')}</select></label>
<label class="field">Proposed joining date<input id="onbJoining" type="date" value="${esc(r?.joiningDate||'')}"></label>
<label class="field">Reporting manager<input id="onbManager" maxlength="80" value="${esc(r?.manager||'')}"></label>
<label class="field">Onboarding coordinator<input id="onbCoordinator" maxlength="80" value="${esc(r?.coordinator||person().name)}"></label>
</div>
<h3>Checklist conditions</h3>
<p class="sub">These select the checklist for this employment type. Hard blocks must be cleared before the joining day.</p>
<div class="onb-flags">
${flagRow('onbExperienced','Has previous employment (experience and relieving documents)',r?r.experienced:true)}
${flagRow('onbScreening','Background checks apply',r?r.screening!==false:true)}
${flagRow('onbWorkAuth','Work authorisation required (hard block)',r?r.workAuth:false)}
${flagRow('onbLicence','Professional licence required (hard block)',r?r.licence:false)}
${flagRow('onbSecurity','Security clearance required',r?r.security:false)}
${flagRow('onbRelocating','Relocation and joining logistics apply',r?r.relocating:false)}
</div>
<div class="callout">Medical fitness is a hard block on every case. The gate blocks a joiner whose medical fitness, induction, or mandatory certificate has expired, with the reason in a full sentence.</div>
<div id="onbFormError" class="onb-error" aria-live="polite"></div>`,
btn('Cancel',"$('#dialog').close()")+btn(r?'Save information':'Create onboarding case',r?`onboardingCreate('${r.id}')`:'onboardingCreate()','primary'))};

global.onboardingCreate=function(existingId){if(!permitted())return;
const name=val('onbName').replace(/\s+/g,' ');
const email=val('onbEmail'),joining=val('onbJoining'),offerDate=val('onbOfferDate');
const fail=m=>{const box=$('#onbFormError');if(box)box.textContent=m};
if(!name)return fail('Employee name is required.');
if(name.length>120||/[<>\x00-\x1f]/.test(name)||/^[=+@]/.test(name))return fail('Enter a valid employee name.');
if(email&&!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email))return fail('Enter a valid email address, or leave it blank.');
if(joining&&offerDate&&joining<offerDate)return fail('The joining date cannot be before the offer date.');
const existing=existingId?find(existingId):null;
if(!existing&&records().some(r=>r.name.toLocaleLowerCase()===name.toLocaleLowerCase()))return fail('A case already exists for this name. Open that case instead.');
const fields={name,dob:val('onbDob'),email,phone:val('onbPhone'),address:val('onbAddress'),
offerRef:val('onbOffer'),offerDate,designation:val('onbDesignation'),grade:val('onbGrade'),dept:val('onbDept'),
location:val('onbLocation'),employmentType:val('onbType'),joiningDate:joining,manager:val('onbManager'),
coordinator:val('onbCoordinator')||person().name,
experienced:checked('onbExperienced'),screening:checked('onbScreening'),workAuth:checked('onbWorkAuth'),
licence:checked('onbLicence'),security:checked('onbSecurity'),relocating:checked('onbRelocating'),needsInfo:false};
const previous=structuredClone(state.onboarding||[]);
if(existing){Object.assign(existing,fields);log(existing,'Employee information updated')}
else{const record=ensure({id:'ONB-'+crypto.randomUUID(),name,started:now(),by:person().name,stage:1,acceptance:null,items:{},history:[],...fields});
log(record,'Offer issued. Offer email sent to the joiner with one link. No document portal link sent yet.');
state.onboarding=[record,...(state.onboarding||[])]}
if(!persist(existing?'Onboarding information updated for '+name:'Onboarding case created for '+name,()=>{state.onboarding=previous}))return;
$('#dialog').close();render();toast(existing?'Employee information saved.':'Onboarding case created. Offer issued.')};

/* ---------- case detail ---------- */
let caseView='overview';
global.onboardingDetail=function(id,view){if(!permitted())return;const r=find(id);if(!r)return;
if(view)caseView=view;
const s=summary(r),adv=canAdvance(r),next=stages[r.stage];
const tick='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>';
const track=stages.map(st=>{const cls=r.stage>st.n?'done':r.stage===st.n?'current':'ahead';return `<li class="${cls}"><span>${cls==='done'?tick:st.n}</span><strong>${st.name}</strong></li>`}).join('');
const info=profilePairs([['Case ID',caseRef(r.id)],['Status',s.status],['Stage',r.stage+' of 8 · '+stageName(r.stage)],
['Designation',r.designation||'Not recorded'],['Grade',r.grade||'Not recorded'],['Department',r.dept||'Not recorded'],
['Employment type',r.employmentType||'Not recorded'],['Work location',r.location||'Not recorded'],
['Offer reference',r.offerRef||'Not recorded'],['Offer date',r.offerDate||'Not recorded'],
['Joining date',r.joiningDate||'Not confirmed'],['Reporting manager',r.manager||'Not recorded'],
['Personal email',r.email||'Not recorded'],['Mobile',r.phone||'Not recorded'],
['Date of birth',r.dob||'Not recorded'],['Address',r.address||'Not recorded'],
['Onboarding coordinator',r.coordinator||r.by],['Case opened',r.started]]);
const groupBlocks=groups.map(group=>{
const items=applicable(r).filter(i=>i.group===group);if(!items.length)return '';
const cleared=items.filter(i=>closed(itemState(r,i.id))).length;
const openHere=items.filter(i=>!closed(itemState(r,i.id))&&!i.optional).length;
return `<details class="onb-group" ${openHere&&items[0].stage<=r.stage?'open':''}><summary>${group} <span>${cleared}/${items.length} cleared${openHere?' · '+openHere+' open':''}</span></summary>
<div class="tablewrap"><table><thead><tr><th>ITEM</th><th>STAGE</th><th>STATE</th><th>NOTES, QUESTIONS AND REPLIES</th><th></th></tr></thead><tbody>
${items.map(i=>{const st=itemState(r,i.id),entry=r.items[i.id]||{};return `<tr><td>${esc(i.name)}${i.hard?' <em class="onb-hard">hard block</em>':''}${i.optional?' <em class="onb-soft">if applicable</em>':''}</td><td>${i.stage}</td><td>${chip(st,tone(st))}</td><td>${entry.note?`<small data-i18n-user>${esc(entry.note)}</small>`:''}${(entry.thread||[]).map(t=>`<div class="onb-thread"><small data-i18n-user>${esc(t.date)} · ${esc(t.by)}: ${esc(t.text)}</small></div>`).join('')}</td><td class="onb-rowactions">${btn('Update',`onboardingItem('${r.id}','${i.id}')`,'link')}${btn('Ask',`onboardingAsk('${r.id}','${i.id}')`,'link')}</td></tr>`}).join('')}
</tbody></table></div></details>`}).join('');
const stageAction='';

/* Joining date and relocation, as settled by the joiner in their portal. */
const confirmActions=()=>'';

function confirmPanel(r){
if(r.stage<3||r.acceptance==='No')return '';
const p=proposalOf(r);
if(p.state==='Not asked')return '';
const rows=[['Joining date',p.date||'Not chosen yet'],['Relocation',p.relocation||'Not answered yet'],
['Chosen by',p.state==='Accepted'?'The joiner, in the portal':'Waiting for the joiner']];
if(p.note)rows.push(['Joiner note',p.note]);
return `<h3>Joining confirmation</h3>${profilePairs(rows)}`}

/* The three workflows the joiner's submission started. */
function workflowPanel(r){
if(!r.workflows)return '';
const runs=workflowStates(r);
const rows=runs.map(run=>`<li><span><strong>${esc(run.name)}</strong><small>${esc(run.state)}</small></span>${run.state==='Drafted'?btn('Review',`onboardingWorkflow('${r.id}','${run.id}')`,'link'):chip(run.state,run.state==='Released'?'ok':'info')}</li>`).join('');
return `<h3>Workflows started on submission</h3>
${profilePairs([['Submitted by the joiner',r.submittedOn||'Not submitted'],['Employee ID',r.employeeId||'Not issued'],['Work email',r.companyEmail||'Not issued']])}
<ul class="onb-runs">${rows}</ul>
${workflowsSettled(r)&&!r.accessReleasedOn?`<div class="toolbar onb-actions">${btn('Release HRMS access',`onboardingRelease('${r.id}')`,'primary')}</div>`:''}
${r.accessReleasedOn?`<p class="onb-released">HRMS access released on ${esc(r.accessReleasedOn)}. The joiner can sign in with ${esc(r.employeeId)}.</p>`:''}`}

/* Finance: the checks first, the compensation only once they pass. */
const checkState=(out,id)=>((out.checkStates||{})[id]||{state:'Pending',note:''});
function financeBoard(r,out,run){
const agent=r.financeAgent||{state:'Not run'};
const checks=out.checks||[];
const passed=checks.filter(c=>checkState(out,c.id).state==='Verified').length;
const cleared=financeCleared(run);
const tone2=st=>st==='Verified'?'ok':st==='Failed'?'bad':'warn';
return `<h3>Identity and bank verification</h3>
<div class="onb-head"><span class="badge ${cleared?'ok':'warn'}">${cleared?'All '+checks.length+' checks passed':'Step '+(checks.findIndex(c=>checkState(out,c.id).state!=='Verified')+1)+' of '+checks.length}</span><small>${passed} verified · ${checks.length-passed} to go</small><span class="onb-progress"><i style="width:${checks.length?Math.round(passed/checks.length*100):0}%"></i></span></div>
${agent.state==='Running'?'<div class="callout">The verification agent is checking the documents…</div>':''}
${agent.state==='Unavailable'?`<div class="callout">The verification agent is not reachable: ${esc(agent.note||'')} Mark a check by hand instead.</div>`:''}
${agent.state==='Drafted'?`<div class="callout">Checked by the verification agent using ${esc(agent.model||'the configured model')}, against what HR has recorded for each document. No account number, PAN or Aadhaar number is held in this demonstration or sent anywhere.</div>`:''}
<ol class="onb-board">${(()=>{const first=checks.findIndex(c=>checkState(out,c.id).state!=='Verified');
return checks.map((c,i)=>{const st=checkState(out,c.id);
return boardRow(c,Object.assign({},st,{note:st.note||'Document on the case: '+itemState(r,c.document)}),run.state==='Released'?chip(st.state,stepTone(st.state)):btn(st.state==='Verified'?'Reopen':'Mark verified',`onboardingFinanceCheck('${r.id}','${c.id}')`,'link'),i===first,i)}).join('')})()}</ol>
${run.state==='Released'?'':`<div class="toolbar onb-actions">${btn(agent.state==='Drafted'?'Run the verification agent again':'Run the verification agent',`onboardingFinanceAgent('${r.id}')`,cleared?'':'primary')}</div>`}
<h3>Compensation</h3>
${cleared?`${profilePairs([['Pay band',out.band],['Payroll group',out.payrollGroup]].concat(out.lines.map(([k,v])=>[k,rupees(v)])).concat([['Monthly gross',rupees(out.gross)],['Employer PF',rupees(out.employerPf)],['Gratuity accrual',rupees(out.gratuity)],['Annual cost to company',rupees(out.annual)]]))}<div class="callout">${esc(out.note)} Releasing records this compensation against the employee record in this browser. No payroll system is written.</div>`
:`<div class="callout">Compensation stays locked until the identity and bank checks pass. ${checks.length-passed} of ${checks.length} still open.</div>`}`}

/* HR record: the identifiers, the pattern and the profile, as one run. */
function recordBoard(r,out,run){
const agent=r.patternAgent||{state:'Not run'};
const pattern=agentPattern(r);
const steps=[
{id:'identity',name:'Employee identifier issued',done:!!r.employeeId,note:r.employeeId||'',by:r.employeeId?'Onboarding agent':''},
{id:'mail',name:'Work email issued',done:!!r.companyEmail,note:r.companyEmail||'',by:r.companyEmail?'Onboarding agent':''},
{id:'pattern',name:'Working pattern drafted',done:agent.state==='Drafted'||!!r.profile,
note:pattern?pattern.shift+' · '+pattern.workHours:out.shift+' · '+out.workHours+' (from the '+(out.templateName||'template')+')',
by:agent.state==='Drafted'?'Profile agent':(r.profile?'Template':'')},
{id:'profile',name:'Profile created in People & Service Records',done:!!r.profile,
note:r.profile?'Created '+r.profile.createdOn+' by '+r.profile.createdBy:'Created when this workflow is released',by:''}];
const done=steps.filter(x=>x.done).length;
const first=steps.findIndex(x=>!x.done);
return `<h3>Employee record</h3>
<div class="onb-head"><span class="badge ${done===steps.length?'ok':'warn'}">${done===steps.length?'All '+steps.length+' steps done':'Step '+(first+1)+' of '+steps.length}</span><small>${done} done · ${steps.length-done} to go</small><span class="onb-progress"><i style="width:${Math.round(done/steps.length*100)}%"></i></span></div>
${agent.state==='Running'?'<div class="callout">The profile agent is drafting the working pattern…</div>':''}
${agent.state==='Unavailable'?`<div class="callout">The profile agent is not reachable: ${esc(agent.note||'')} The template pattern is used instead.</div>`:''}
${agent.state==='Drafted'&&pattern?`<div class="callout">Pattern drafted by the profile agent using ${esc(agent.model||pattern.model||'the configured model')}. ${esc(pattern.rationale||'')}</div>`:''}
<ol class="onb-board">${steps.map((step,i)=>boardRow(step,{state:step.done?'Verified':'Pending',note:step.note,by:step.by,date:''},
step.id==='pattern'&&run.state!=='Released'?btn(agent.state==='Drafted'?'Run again':'Run the agent',`onboardingAgentDraft('${r.id}',true)`,'link'):'',i===first,i)).join('')}</ol>
${profilePairs([['Template',(pattern?'Drafted by the profile agent':out.templateName)||'Not recorded'],['Working pattern',pattern?pattern.shift:out.shift],['Work hours',pattern?pattern.workHours:out.workHours],['Hours per week',String(pattern?pattern.weeklyHours:out.weeklyHours)],['Weekly off',pattern?pattern.weeklyOff:out.weeklyOff],['Attendance scheme',pattern?pattern.attendanceScheme:out.attendanceScheme],['Probation ends',out.probationEnd||'Not applicable'],['Leave entitlement',out.leaveEntitlement],['Access',(pattern?['HRMS self-service','Attendance','Payroll documents'].concat(pattern.access||[]):out.access).join(', ')]])}
<div class="callout">Releasing creates the employee profile in People &amp; Service Records.</div>`}

/* Relocation as a board: every task, what the agent arranged, what is still
   waiting. Booked here means recorded as arranged, never a real booking. */
const taskState=(out,id)=>((out.states||{})[id]||{state:'Pending',note:''});
const stepTone=st=>st==='Verified'||st==='Booked'?'ok':st==='Failed'?'bad':'warn';
function boardRow(step,st,action,current,index){
const done=st.state==='Booked'||st.state==='Verified';
const cls=done?'done':st.state==='Failed'?'failed':current?'current':'open';
return `<li class="${cls}">
<span class="onb-step-icon">${done?tickIcon:stepIcon(step.id)}<i class="onb-step-n">${index+1}</i></span>
<div class="onb-step-body"><strong>${esc(step.name)}</strong>
${st.note?`<small>${esc(st.note)}</small>`:''}
${st.by?`<em>${esc(st.state)} · ${esc(st.by)} · ${esc(st.date||'')}</em>`:''}</div>
<div class="onb-step-action">${action}</div></li>`}
function relocationBoard(r,out,run){
const agent=r.logisticsAgent||{state:'Not run'};
const done=out.tasks.filter(t=>taskState(out,t.id).state==='Booked').length;
return `<div class="onb-head"><span class="badge ${done===out.tasks.length?'ok':'warn'}">${done===out.tasks.length?'All '+out.tasks.length+' steps done':'Step '+(out.tasks.findIndex(t=>taskState(out,t.id).state!=='Booked')+1)+' of '+out.tasks.length}</span><small>${done} arranged · ${out.tasks.length-done} to go</small><span class="onb-progress"><i style="width:${Math.round(done/out.tasks.length*100)}%"></i></span></div>
${agent.state==='Running'?'<div class="callout">The relocation agent is working through the list…</div>':''}
${agent.state==='Unavailable'?`<div class="callout">The relocation agent is not reachable: ${esc(agent.note||'')} Mark a task arranged by hand instead.</div>`:''}
${agent.state==='Drafted'?`<div class="callout">Planned by the relocation agent using ${esc(agent.model||'the configured model')}. Nothing is booked with a carrier, a guest house or a vendor: this records what the desk would arrange.</div>`:''}
<ol class="onb-board">${(()=>{const first=out.tasks.findIndex(t=>taskState(out,t.id).state!=='Booked');
return out.tasks.map((t,i)=>{const st=taskState(out,t.id);
return boardRow(t,st,run.state==='Released'?chip(st.state,stepTone(st.state)):btn(st.state==='Booked'?'Reopen':'Mark arranged',`onboardingRelocationTask('${r.id}','${t.id}')`,'link'),i===first,i)}).join('')})()}</ol>
${run.state==='Released'?'':`<div class="toolbar onb-actions">${btn(agent.state==='Drafted'?'Run the relocation agent again':'Run the relocation agent',`onboardingRelocationAgent('${r.id}')`,'primary')}</div>`}`}

global.onboardingFinanceCheck=function(id,checkId){if(!permitted())return;const r=find(id);if(!r)return;
const run=r.workflows&&r.workflows.finance;if(!run||run.state==='Released')return;
const previous=structuredClone(state.onboarding);
const out=run.output;out.checkStates=out.checkStates||{};
const current=out.checkStates[checkId]||{state:'Pending'};
const next=current.state==='Verified'?'Pending':'Verified';
const check=(out.checks||[]).find(c=>c.id===checkId);
out.checkStates[checkId]={state:next,note:current.note||'',by:person().name,date:now()};
log(r,check.name+' marked '+next.toLowerCase()+' by HR');
if(!persist('Finance check '+next.toLowerCase()+' for '+r.name+': '+check.name,()=>{state.onboarding=previous}))return;
render();onboardingWorkflow(id,'finance')};

global.onboardingFinanceAgent=async function(id){
const r=find(id);if(!r||!permitted())return;
const run=r.workflows&&r.workflows.finance;
if(!run||run.state==='Released')return;
if(agentBusy(r.financeAgent))return toast('That agent is already running.');
const token=Date.now();r.financeAgent={state:'Running',ranOn:now(),startedAt:token};
render();onboardingWorkflow(id,'finance');
let outcome;
try{
const response=await fetch('/api/verify',{method:'POST',headers:{'Content-Type':'application/json'},
body:JSON.stringify({case:{designation:r.designation,dept:r.dept,grade:r.grade,employmentType:r.employmentType,location:r.location,category:categoryOf(r)},
checks:(run.output.checks||[]).map(c=>({id:c.id,name:c.name,document:checklist.find(i=>i.id===c.document)?.name||c.document,documentState:itemState(r,c.document)}))})});
const data=await response.json().catch(()=>({}));
outcome=response.ok?{state:'Drafted',checks:data.checks,model:data.model,ranOn:now()}
:{state:'Unavailable',note:data.error||'The verification agent could not be reached.',ranOn:now()};
}catch(e){outcome={state:'Unavailable',note:'The verification agent is not available on this preview.',ranOn:now()}}
const current=find(id);if(!current)return;
/* A slower run must not overwrite a newer one. */
if(current.financeAgent&&current.financeAgent.startedAt&&current.financeAgent.startedAt!==token)return;
const live=current.workflows&&current.workflows.finance;
current.financeAgent={state:outcome.state,note:outcome.note,model:outcome.model,ranOn:outcome.ranOn};
if(outcome.state==='Drafted'&&live){
live.output.checkStates=live.output.checkStates||{};
for(const c of outcome.checks)live.output.checkStates[c.id]={state:c.status,note:c.note,by:'Verification agent',date:now()};
const passed=outcome.checks.filter(c=>c.status==='Verified').length;
log(current,'Verification agent checked '+outcome.checks.length+' item(s): '+passed+' verified'+(financeCleared(live)?'. Compensation is enabled.':', the rest still open'))}
else log(current,'Verification agent unavailable · '+(outcome.note||''));
try{save()}catch{}
render();onboardingWorkflow(id,'finance');
toast(outcome.state==='Drafted'?(financeCleared(live)?'Checks passed. Compensation is enabled.':'Verification finished. Some checks are still open.'):outcome.note)};

global.onboardingRelocationTask=function(id,taskId){if(!permitted())return;const r=find(id);if(!r)return;
const run=r.workflows&&r.workflows.logistics;if(!run||run.state==='Released')return;
const previous=structuredClone(state.onboarding);
const out=run.output;out.states=out.states||{};
const current=out.states[taskId]||{state:'Pending'};
const next=current.state==='Booked'?'Pending':'Booked';
const task=out.tasks.find(t=>t.id===taskId);
out.states[taskId]={state:next,note:current.note||'',by:person().name,date:now()};
log(r,task.name+' marked '+next.toLowerCase()+' by HR');
if(!persist('Relocation task '+next.toLowerCase()+' for '+r.name+': '+task.name,()=>{state.onboarding=previous}))return;
render();onboardingWorkflow(id,'logistics')};

global.onboardingRelocationAgent=async function(id){
const r=find(id);if(!r||!permitted())return;
const run=r.workflows&&r.workflows.logistics;
if(!run||run.state==='Released'||!run.output.needed)return;
if(agentBusy(r.logisticsAgent))return toast('That agent is already running.');
const token=Date.now();r.logisticsAgent={state:'Running',ranOn:now(),startedAt:token};
render();onboardingWorkflow(id,'logistics');
let outcome;
try{
const response=await fetch('/api/logistics',{method:'POST',headers:{'Content-Type':'application/json'},
body:JSON.stringify({case:{designation:r.designation,dept:r.dept,grade:r.grade,employmentType:r.employmentType,location:r.location,category:categoryOf(r),relocating:true},
joiningDate:r.joiningDate||'',tasks:run.output.tasks.map(t=>({id:t.id,name:t.name}))})});
const data=await response.json().catch(()=>({}));
outcome=response.ok?{state:'Drafted',arrangements:data.arrangements,model:data.model,ranOn:now()}
:{state:'Unavailable',note:data.error||'The relocation agent could not be reached.',ranOn:now()};
}catch(e){outcome={state:'Unavailable',note:'The relocation agent is not available on this preview.',ranOn:now()}}
const current=find(id);if(!current)return;
/* A slower run must not overwrite a newer one. */
if(current.logisticsAgent&&current.logisticsAgent.startedAt&&current.logisticsAgent.startedAt!==token)return;
const live=current.workflows&&current.workflows.logistics;
current.logisticsAgent={state:outcome.state,note:outcome.note,model:outcome.model,ranOn:outcome.ranOn};
if(outcome.state==='Drafted'&&live){
live.output.states=live.output.states||{};
for(const a of outcome.arrangements)live.output.states[a.id]={state:a.status,note:a.note,by:'Relocation agent',date:now()};
const booked=outcome.arrangements.filter(a=>a.status==='Booked').length;
log(current,'Relocation agent worked through '+outcome.arrangements.length+' task(s): '+booked+' arranged, '+(outcome.arrangements.length-booked)+' still waiting')}
else log(current,'Relocation agent unavailable · '+(outcome.note||''));
try{save()}catch{}
render();onboardingWorkflow(id,'logistics');
toast(outcome.state==='Drafted'?'Relocation agent finished.':outcome.note)};

global.onboardingWorkflow=function(id,runId){if(!permitted())return;const r=find(id);if(!r||!r.workflows||!r.workflows[runId])return;
const run=r.workflows[runId],out=run.output;
let body='';
if(runId==='finance')body=financeBoard(r,out,run);
else if(runId==='logistics')body=out.needed?relocationBoard(r,out,run):'<div class="callout">The joiner answered that relocation is not needed, so this workflow has nothing to do.</div>';
else body=recordBoard(r,out,run);
const blocked=runId==='finance'&&!financeCleared(run);
modal(workflowNames[runId],body,btn('Close',`onboardingDetail('${id}')`)+(run.state==='Drafted'?(blocked?'<button disabled title="The identity and bank checks have to pass first">Release</button>':btn('Release',`onboardingReleaseRun('${id}','${runId}')`,'primary')):''))};

global.onboardingReleaseRun=function(id,runId){if(!permitted())return;const r=find(id);if(!r||!r.workflows||!r.workflows[runId])return;
const previous=structuredClone(state.onboarding),previousProfiles=structuredClone(state.hrmsProfiles||[]);
const run=r.workflows[runId];
run.state='Released';run.releasedOn=now();run.releasedBy=person().name;
if(runId==='hr'&&!r.profile){const draft=Object.assign({},run.output,{createdOn:now(),createdBy:person().name,case:r.id,companyEmail:r.companyEmail});
r.profile=draft;state.hrmsProfiles=[...(state.hrmsProfiles||[]),draft];if(typeof syncPeople==='function')syncPeople()}
if(runId==='finance')r.compensation=run.output;
log(r,workflowNames[runId]+' released by HR');
if(!persist('Workflow released for '+r.name+': '+workflowNames[runId],()=>{state.onboarding=previous;state.hrmsProfiles=previousProfiles}))return;
render();onboardingDetail(id);toast(workflowNames[runId]+' released.')};

global.onboardingRelease=function(id){if(!permitted())return;const r=find(id);if(!r||!workflowsSettled(r)||r.accessReleasedOn)return;
const previous=structuredClone(state.onboarding);
r.accessReleasedOn=now();
const notice=composeNotice(r,'ready');
(r.notices||(r.notices=[])).unshift(Object.assign({sentOn:now(),to:r.email||'the joiner'},notice));
log(r,'HRMS access released. Email sent: '+notice.subject);
if(!persist('HRMS access released for '+r.name,()=>{state.onboarding=previous}))return;
render();onboardingDetail(id);toast('HRMS access released. The joiner can sign in.')};

/* The employee identifier and the profile, once they exist. */
function profilePanel(r){
if(r.stage<4||r.acceptance==='No'||(!r.employeeId&&!r.profile))return '';
const draft=r.profile;
if(!draft)return `<h3>Employee record</h3>${profilePairs([['Employee ID',r.employeeId],['Profile','Not created yet']])}
<div class="toolbar onb-actions">${btn('Draft the employee profile',`onboardingDraftProfile('${r.id}')`,'primary')}</div>`;
return `<h3>Employee record</h3>${profilePairs([['Employee ID',draft.id],['Template',draft.templateName||'Not recorded'],['Working pattern',draft.shift],['Work hours',draft.workHours],['Hours per week',String(draft.weeklyHours)],['Weekly off',draft.weeklyOff],['Attendance scheme',draft.attendanceScheme],['Probation ends',draft.probationEnd||'Not applicable'],['Payroll group',draft.payrollGroup],['Leave entitlement',draft.leaveEntitlement],['Access',draft.access.join(', ')],['Training',draft.training.map(t=>t.name).join(', ')],['Profile created',draft.createdOn+' by '+draft.createdBy]])}
<div class="toolbar onb-actions">${btn('Open in People & Service Records',`onboardingOpenProfile('${r.id}')`)}</div>`}

const icon={
info:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.6v.4"/></svg>',
history:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
checklist:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7l2 2 3-3M4 15l2 2 3-3M13 8h7M13 16h7"/></svg>',
back:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>'};
const iconButton=(name,label,fn)=>`<button class="onb-iconbtn" title="${label}" aria-label="${label}" onclick="${fn}">${icon[name]}<span>${label}</span></button>`;

const body={
overview:`
<h3 class="onb-name" data-i18n-user>${esc(r.name)}</h3>
<div class="onb-head">${chip(s.status,tone(s.status))}<span class="onb-progress"><i style="width:${s.percent}%"></i></span><small>${s.done} of ${s.total} checklist items cleared</small></div>
${r.needsInfo?`<div class="callout">Employee information is incomplete for this case. ${btn('Add employee information',`onboardingNew('${r.id}')`,'link')}</div>`:''}
${r.acceptance===null?`<div class="callout">Waiting for the candidate to accept the offer and the terms in their joining portal. The joining date and relocation follow there, in the same place.</div>`:''}
${r.acceptance==='No'?'<div class="callout">The joiner declined the offer. The case is stopped and onboarding does not start.</div>':''}
<div class="onb-stagenow"><span>Stage ${r.stage} of 8</span><strong>${esc(stageName(r.stage))}</strong></div>
<ol class="onb-track">${track}</ol>
<div class="toolbar onb-actions">${stageAction}${confirmActions(r)}${r.acceptance!=='No'&&r.stage>1&&next?(adv.ok?btn('Advance to '+next.name,`onboardingAdvance('${r.id}')`,'primary'):`<button disabled title="${esc(adv.reason)}">Advance to ${esc(next.name)}</button>`):''}${btn('Edit information',`onboardingNew('${r.id}')`)}${r.acceptance==='No'?'':btn('Open the joiner portal',`onboardingPortal('${r.id}')`)}${r.acceptance==='Yes'&&r.stage>=3&&s.open.length?btn('Clear remaining checks (demo)',`onboardingClearChecks('${r.id}')`):''}</div>
${confirmPanel(r)}
${workflowPanel(r)}
${profilePanel(r)}`,
checklist:`<h3>Checklist · <span data-i18n-user>${esc(r.name)}</span></h3>${groupBlocks}`,
info:`<h3>Employee information · <span data-i18n-user>${esc(r.name)}</span></h3>${info}`,
history:`<h3>Activity history · <span data-i18n-user>${esc(r.name)}</span></h3><div class="onb-history">${r.history.map(e=>`<p><small data-i18n-user>${esc(e.date)} · ${esc(e.by||'')} · ${esc(e.action)}</small></p>`).join('')}</div>`};

const foot=caseView==='overview'
?`<div class="onb-footleft">${iconButton('info','Employee information',`onboardingDetail('${r.id}','info')`)}${iconButton('history','Activity history',`onboardingDetail('${r.id}','history')`)}${iconButton('checklist','Checklist',`onboardingDetail('${r.id}','checklist')`)}<small class="onb-footnote">${s.done} of ${s.total} cleared</small></div>${btn('Close',"$('#dialog').close()")}`
:`<div class="onb-footleft"><button class="onb-back" onclick="onboardingDetail('${r.id}','overview')">${icon.back}Back</button></div>${btn('Close',"$('#dialog').close()")}`;

caseModal('Onboarding workflow',body[caseView]||body.overview,foot,true)};

/* The other half of the demonstration shortcut: clears what HR would have
   verified at this stage, including the hard blocks and the joining
   confirmation, so a case can be walked forward without working through every
   row. It never advances the stage and never submits for the joiner. */
global.onboardingClearChecks=function(id){if(!permitted())return;const r=find(id);if(!r)return;
if(r.acceptance!=='Yes')return toast('Record the offer acceptance first.');
const due=summary(r).open;
if(!due.length)return toast('Nothing outstanding at this stage.');
const settles=due.some(i=>i.id==='k_relocation'||i.id==='k_joindate');
modal('Clear the remaining checks',`<p>This marks the ${due.length} item(s) still open at <strong>${esc(stageName(r.stage))}</strong> as cleared, so the case can be walked forward in a demonstration.</p>
<div class="tablewrap" style="max-height:200px;overflow:auto"><table><thead><tr><th>ITEM</th><th>STATE</th></tr></thead><tbody>${due.map(i=>`<tr><td>${esc(i.name)}${i.hard?' <em class="onb-hard">hard block</em>':''}</td><td>${esc(itemState(r,i.id))}</td></tr>`).join('')}</tbody></table></div>
<div class="callout">Hard blocks such as medical fitness are cleared too. In a real case each of these is somebody's decision with evidence behind it.</div>
${settles?'<p class="sub">The joining confirmation is recorded as agreed on the joining date already held on the case.</p>':''}`,
btn('Cancel',`onboardingDetail('${id}')`)+btn('Clear '+due.length+' item(s)',`onboardingClearChecksConfirm('${id}')`,'primary'))};

function settleOpen(r){
const due=summary(r).open;
for(const item of due)r.items[item.id]=Object.assign(r.items[item.id]||{},{state:'Verified',note:'Cleared for the demonstration',by:person().name,date:now()});
if(due.some(i=>i.id==='k_relocation'||i.id==='k_joindate')&&proposalOf(r).state!=='Accepted'){
r.joiningProposal={state:'Accepted',date:r.joiningDate||'',relocation:r.relocating?'Needed':'Not needed',proposed:[],note:''}}
return due.length}

global.onboardingClearChecksConfirm=function(id){if(!permitted())return;const r=find(id);if(!r)return;
const due=summary(r).open;
if(!due.length)return;
const previous=structuredClone(state.onboarding);
settleOpen(r);
log(r,due.length+' item(s) cleared for the demonstration at '+stageName(r.stage));
if(!persist('Checks cleared for the demonstration: '+r.name,()=>{state.onboarding=previous}))return;
render();onboardingDetail(id);toast(due.length+' item(s) cleared.')};

/* The profile agent. It asks the Worker for a working pattern for the role,
   and falls back to the template when the endpoint is not there, which is the
   case on the static preview and wherever no key is configured. */
global.onboardingAgentDraft=async function(id,manual){
const r=find(id);if(!r||!permitted())return;
if(agentBusy(r.patternAgent))return toast('That agent is already running.');
const token=Date.now();r.patternAgent={state:'Running',ranOn:now(),startedAt:token};
if(manual){render();if(r.workflows&&r.workflows.hr)onboardingWorkflow(id,'hr');else onboardingDetail(id)}
let outcome;
try{
const response=await fetch('/api/profile',{method:'POST',headers:{'Content-Type':'application/json'},
body:JSON.stringify({case:{designation:r.designation,dept:r.dept,grade:r.grade,employmentType:r.employmentType,location:r.location,category:categoryOf(r),relocating:!!r.relocating}})});
const data=await response.json().catch(()=>({}));
outcome=response.ok?{state:'Drafted',pattern:data,ranOn:now()}
:{state:'Unavailable',note:data.error||'The profile agent could not be reached.',ranOn:now()};
}catch(e){outcome={state:'Unavailable',note:'The profile agent is not available on this preview.',ranOn:now()}}
const current=find(id);if(!current)return;
/* A slower run must not overwrite a newer one. */
if(current.patternAgent&&current.patternAgent.startedAt&&current.patternAgent.startedAt!==token)return;
current.patternAgent=outcome;
if(outcome.state==='Drafted')log(current,'Profile agent drafted a working pattern: '+outcome.pattern.shift+', '+outcome.pattern.workHours);
else log(current,'Profile agent unavailable · '+outcome.note+' The template pattern is used instead.');
try{save()}catch{}
render();if(manual){const live=find(id);if(live&&live.workflows&&live.workflows.hr)onboardingWorkflow(id,'hr');else onboardingDetail(id)}
if(manual)toast(outcome.state==='Drafted'?'Profile agent drafted the pattern.':outcome.note)};

const agentPattern=r=>r.patternAgent&&r.patternAgent.state==='Drafted'?r.patternAgent.pattern:null;
const profileFor=r=>applyPattern(draftProfile(r),agentPattern(r));

/* The joiner's own link into this case. */
global.onboardingPortal=function(id){if(!permitted())return;const r=find(id);if(!r)return;
if(!r.portalToken){try{save()}catch{}}
$('#dialog').close();location.hash='#/joining/'+r.portalToken};

global.onboardingAdvance=function(id){if(!permitted())return;const r=find(id);if(!r)return;
const check=canAdvance(r);
if(!check.ok)return toast(check.reason);
const next=stages[r.stage];if(!next)return;
caseModal('Advance this case',`<p>Move <strong data-i18n-user>${esc(r.name)}</strong> from <strong>${esc(stageName(r.stage))}</strong> to <strong>${esc(next.name)}</strong>?</p><p class="sub">${esc(next.note)}</p><label class="field full">Note for the history (optional)<input id="onbAdvanceNote" maxlength="160"></label>`,
btn('Cancel',`onboardingDetail('${id}')`)+btn('Confirm',`onboardingAdvanceConfirm('${id}')`,'primary'))};

global.onboardingAdvanceConfirm=function(id){if(!permitted())return;const r=find(id);if(!r)return;
const check=canAdvance(r);if(!check.ok)return toast(check.reason);
const note=val('onbAdvanceNote'),previous=structuredClone(state.onboarding);
r.stage=Math.min(8,r.stage+1);
log(r,'Stage advanced to '+stageName(r.stage)+(note?' · '+note:''));
if(r.stage>=4&&!r.employeeId){issueEmployeeId(r);log(r,'Employee identifier '+r.employeeId+' issued on reaching Ready to join')}
const reachedReady=r.stage===4;
if(!persist('Onboarding stage advanced for '+r.name+' to '+stageName(r.stage),()=>{state.onboarding=previous}))return;
render();onboardingDetail(id);toast('Stage advanced to '+stageName(r.stage)+'.');
if(reachedReady&&!r.patternAgent)onboardingAgentDraft(id)};

/* ---------- joining confirmation ---------- */
const setItem=(record,itemId,state,note)=>{record.items[itemId]=Object.assign(record.items[itemId]||{},{state,note:note||'',by:person().name,date:now()})};

global.onboardingDraftProfile=function(id){if(!permitted())return;const r=find(id);if(!r)return;
if(!r.employeeId)return toast('The employee identifier is issued at Ready to join.');
const draft=profileFor(r);
const matched=matchTemplate(r);
const agent=r.patternAgent||{state:'Not run'};
caseModal('Employee profile draft',`<p class="sub">Drafted from onboarding case ${esc(r.id)} by the profile agent. Nothing is created until HR approves this draft. Review the working pattern and entitlement before approving.</p>
${draft.drafter==='agent'
?`<div class="callout"><strong>Drafted by the profile agent</strong> from the designation, department, grade and employment type, using ${esc(agent.pattern&&agent.pattern.model||'the configured model')}. ${esc(draft.rationale||'')} HR reviews it before anything is created.</div>`
:`<div class="callout"><strong>${esc(draft.templateName)}</strong> applied${draft.templateChosenByHR?' by HR, in place of the '+esc(matched.name.toLowerCase())+' matched from the designation':' from the designation and role'}. ${esc(templateById(draft.template).covers)}.${agent.state==='Unavailable'?' The profile agent was not reachable: '+esc(agent.note||''):''}</div>`}
<div class="toolbar onb-actions">${btn(agent.state==='Drafted'?'Run the profile agent again':'Run the profile agent',`onboardingAgentDraft('${r.id}',true)`)}${draft.drafter==='agent'?btn('Use the template pattern',`onboardingAgentClear('${r.id}')`):''}</div>
<label class="field full">Working pattern template<select id="onbTemplate">${profileTemplates.map(t=>`<option value="${t.id}" ${t.id===draft.template?'selected':''}>${t.name}${t.id===matched.id?' · matched from the designation':''}</option>`).join('')}</select></label>
<div class="toolbar onb-actions">${btn('Apply this pattern',`onboardingApplyTemplate('${r.id}')`)}${draft.templateChosenByHR?btn('Use the matched pattern',`onboardingResetTemplate('${r.id}')`):''}</div>
${profilePairs([['Employee ID',draft.id],['Name',draft.name],['Designation',draft.job],['Category',draft.category],['Department',draft.dept],['Work location',draft.location],['Employment',draft.employment],['Grade',draft.grade||'Not recorded'],['Template',draft.templateName],['Working pattern',draft.shift],['Work hours',draft.workHours],['Hours per week',String(draft.weeklyHours)],['Weekly off',draft.weeklyOff],['Attendance scheme',draft.attendanceScheme],['Joining date',draft.joiningDate||'Not confirmed'],['Probation ends',draft.probationEnd||'Not applicable'],['Reporting manager',draft.manager],['Payroll group',draft.payrollGroup],['Leave entitlement',draft.leaveEntitlement],['Access',draft.access.join(', ')],['Training',draft.training.map(t=>t.name+' (renew every '+t.renewal+')').join(' · ')]])}
<div class="callout">Approving adds this profile to People &amp; Service Records in this browser. No payroll, attendance device, or external system is written.</div>`,
btn('Cancel',`onboardingDetail('${id}')`)+btn('Approve and create profile',`onboardingCreateProfile('${id}')`,'primary'))};

global.onboardingAgentClear=function(id){if(!permitted())return;const r=find(id);if(!r)return;
const previous=structuredClone(state.onboarding);
r.patternAgent={state:'Set aside',ranOn:now()};
log(r,'Profile agent pattern set aside. The template pattern is used.');
if(!persist('Profile agent pattern set aside for '+r.name,()=>{state.onboarding=previous}))return;
render();onboardingDraftProfile(id);toast('Template pattern restored.')};

global.onboardingApplyTemplate=function(id){if(!permitted())return;const r=find(id);if(!r)return;
const choice=val('onbTemplate'),template=templateById(choice);
if(!template)return;
const previous=structuredClone(state.onboarding);
if(template.id===matchTemplate(r).id)delete r.profileTemplate;else r.profileTemplate=template.id;
log(r,'Profile pattern set to '+template.name+(r.profileTemplate?' by HR':' (matched from the designation)'));
if(!persist('Profile pattern changed for '+r.name+': '+template.name,()=>{state.onboarding=previous}))return;
render();onboardingDraftProfile(id);toast(template.name+' applied to the draft.')};

global.onboardingResetTemplate=function(id){if(!permitted())return;const r=find(id);if(!r)return;
const previous=structuredClone(state.onboarding);
delete r.profileTemplate;
log(r,'Profile pattern returned to the '+matchTemplate(r).name.toLowerCase()+' matched from the designation');
if(!persist('Profile pattern reset for '+r.name,()=>{state.onboarding=previous}))return;
render();onboardingDraftProfile(id);toast('Matched pattern restored.')};

global.onboardingCreateProfile=function(id){if(!permitted())return;const r=find(id);if(!r)return;
if(!r.employeeId)return toast('The employee identifier is issued at Ready to join.');
if(r.profile)return toast('A profile already exists for this case.');
const previousCases=structuredClone(state.onboarding),previousProfiles=structuredClone(state.hrmsProfiles||[]);
const draft=profileFor(r);
draft.createdOn=now();draft.createdBy=person().name;draft.case=r.id;
r.profile=draft;
state.hrmsProfiles=[...(state.hrmsProfiles||[]),draft];
if(typeof syncPeople==='function')syncPeople();
log(r,'Employee profile created in the HRMS portal for '+draft.id+' · '+draft.shift+' pattern, '+draft.workHours);
if(!persist('Employee profile created for '+r.name+' ('+draft.id+')',()=>{state.onboarding=previousCases;state.hrmsProfiles=previousProfiles}))return;
render();onboardingDetail(id);toast('Profile created for '+draft.id+'.')};

global.onboardingOpenProfile=function(id){if(!permitted())return;const r=find(id);if(!r||!r.profile)return;
$('#dialog').close();profileId=r.profile.id;go('People & Service Records');openProfile(r.profile.id)};

global.onboardingItem=function(id,itemId){if(!permitted())return;const r=find(id);if(!r)return;
const item=checklist.find(i=>i.id===itemId);if(!item)return;
const current=itemState(r,itemId),entry=r.items[itemId]||{};
caseModal('Update checklist item',`<h3>${esc(item.name)}</h3><p class="sub">${esc(item.group)} · from stage ${item.stage}${item.hard?' · hard block':''}</p>
<label class="field full">State<select id="onbItemState">${states.map(s=>`<option ${s===current?'selected':''}>${s}</option>`).join('')}</select></label>
<label class="field full">Reason or note<input id="onbItemNote" maxlength="160" value="${esc(entry.note||'')}" placeholder="e.g. Marksheet verification in progress with the college"></label>
<p class="sub">A failed item can be resubmitted and checked again. Waived records a deliberate HR decision that this item does not apply.</p>`,
btn('Cancel',`onboardingDetail('${id}')`)+btn('Save',`onboardingItemSave('${id}','${itemId}')`,'primary'))};

global.onboardingItemSave=function(id,itemId){if(!permitted())return;const r=find(id);if(!r)return;
const item=checklist.find(i=>i.id===itemId);if(!item)return;
const next=val('onbItemState'),note=val('onbItemNote');
if(!states.includes(next))return;
if(next==='Failed'&&!note)return toast('Record the reason when an item fails.');
const previous=structuredClone(state.onboarding);
const entry=r.items[itemId]||(r.items[itemId]={});
entry.state=next;entry.note=note;entry.by=person().name;entry.date=now();
log(r,item.name+' set to '+next+(note?' · '+note:''));
if(!persist('Onboarding item updated for '+r.name+': '+item.name+' → '+next,()=>{state.onboarding=previous}))return;
render();onboardingDetail(id);toast(item.name+' set to '+next+'.')};

global.onboardingAsk=function(id,itemId){if(!permitted())return;const r=find(id);if(!r)return;
const item=checklist.find(i=>i.id===itemId);if(!item)return;
caseModal('Ask a question',`<h3>${esc(item.name)}</h3><p class="sub">The joiner sees the question in the case, replies, and uploads the correct document. Every question, reply and upload is logged with date and owner.</p>
<label class="field full">Question or reply<input id="onbQuestion" maxlength="200" placeholder="e.g. Did you upload the wrong document?"></label>
<label class="field full">Recorded as<select id="onbQuestionBy"><option value="hr">Question from HR</option><option value="joiner">Reply recorded from the joiner</option></select></label>`,
btn('Cancel',`onboardingDetail('${id}')`)+btn('Record',`onboardingAskSave('${id}','${itemId}')`,'primary'))};

global.onboardingAskSave=function(id,itemId){if(!permitted())return;const r=find(id);if(!r)return;
const item=checklist.find(i=>i.id===itemId),text=val('onbQuestion');if(!item)return;
if(!text)return toast('Enter the question or reply first.');
const from=val('onbQuestionBy')==='joiner'?r.name:person().name;
const previous=structuredClone(state.onboarding);
const entry=r.items[itemId]||(r.items[itemId]={state:'Pending'});
(entry.thread||(entry.thread=[])).push({date:now(),by:from,text});
log(r,'Question or reply recorded on '+item.name+' by '+from);
if(!persist('Onboarding question recorded for '+r.name+' on '+item.name,()=>{state.onboarding=previous}))return;
render();onboardingDetail(id);toast('Recorded on the case.')};

/* ---------- bulk upload ---------- */
const describeFields=fields=>{const f=fields||{};const parts=[];
if(f.designation)parts.push(f.designation+(f.grade?' · '+f.grade:''));
if(f.dept)parts.push(f.dept);
if(f.joiningDate)parts.push('joining '+f.joiningDate);
if(f.relocating)parts.push('relocation');
return parts.length?parts.join(' · '):'Name only'};

global.onboardingUpload=function(){if(!permitted())return;preview=[];fileName='';reading++;caseModal('Upload employee list',`<p>Create one onboarding case per name. Open each case afterwards and complete the employee information before the offer goes out.</p><label class="field">Employee list<input id="onboardFile" type="file" accept=".csv,.txt,text/csv,text/plain" onchange="onboardingRead(this.files[0])"></label><p class="sub">Maximum 200 KB and 500 employees. Excel files: save as CSV first.</p><div id="onboardPreview" aria-live="polite"></div>`,btn('Cancel',"$('#dialog').close()")+`<button class="primary" id="onboardStart" onclick="onboardingStart()" disabled>Start onboarding</button>`)};

global.onboardingRead=async function(file){if(!permitted())return;const token=++reading;preview=[];$('#onboardStart').disabled=true;if(!file)return;fileName=file.name;try{if(!/\.(csv|txt)$/i.test(file.name))throw Error('Choose a CSV or TXT file.');if(file.size>200000)throw Error('Use a file smaller than 200 KB.');const content=await file.text();if(token!==reading||!permitted()||!$('#onboardPreview'))return;preview=parse(content,records().map(r=>r.name));const valid=preview.filter(r=>!r.issue);$('#onboardPreview').innerHTML=`<h3>Review ${esc(fileName)}</h3><p>${valid.length} ready · ${preview.length-valid.length} excluded</p><p class="sub">Duplicates and invalid rows will be skipped. Namesakes can be reviewed separately when employee identifiers are added.</p><div class="tablewrap" style="max-height:280px;overflow:auto"><table><thead><tr><th>ROW</th><th>EMPLOYEE NAME</th><th>DETAILS IN THE FILE</th><th>RESULT</th></tr></thead><tbody>${preview.map(r=>`<tr><td>${r.row}</td><td data-i18n-user>${esc(r.name)}</td><td><small>${esc(describeFields(r.fields))}</small></td><td>${r.issue?esc(r.issue):'Ready'}</td></tr>`).join('')}</tbody></table></div>`;$('#onboardStart').disabled=!valid.length;$('#onboardStart').textContent='Start onboarding ('+valid.length+')'}catch(e){if(token===reading&&$('#onboardPreview'))$('#onboardPreview').textContent=e.message}};

global.onboardingStart=function(){if(!permitted()||!preview.length)return;const existing=new Set(records().map(r=>r.name.toLocaleLowerCase()));const ready=preview.filter(r=>!r.issue&&!existing.has(r.name.toLocaleLowerCase()));if(!ready.length)return;const previous=state.onboarding||[];const stamp=now();const batch=crypto.randomUUID();
const created=ready.map(r=>{const fields=r.fields||{};
const complete=!!(fields.designation&&fields.grade&&fields.dept&&fields.joiningDate&&fields.employmentType);
const record=ensure(Object.assign({id:'ONB-'+crypto.randomUUID(),batch,name:r.name,started:stamp,by:person().name,stage:1,acceptance:null,items:{},history:[],coordinator:person().name,screening:true,experienced:true,offerDate:today()},fields,{needsInfo:!complete}));
log(record,complete?'Offer issued from the uploaded employee list, with the employee information the file carried.':'Offer issued from the uploaded employee list. Employee information is incomplete.');
return record});
state.onboarding=[...created,...previous];
if(!persist('Onboarding batch initiated: '+created.length+' employees',()=>{state.onboarding=previous}))return;
preview=[];$('#dialog').close();render();const incomplete=created.filter(r=>r.needsInfo).length;
toast(created.length+' onboarding case(s) created.'+(incomplete?' Complete the employee information on '+incomplete+' of them.':' Every case carried its employee information.'))};
})(typeof window!=='undefined'?window:globalThis);
