(function(global){
function parse(text,existing=[]){if(text.length>200000)throw Error('Use a file smaller than 200 KB.');const rows=[];let row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(c===','&&!quoted){row.push(cell);cell=''}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell=''}else cell+=c}if(quoted)throw Error('Unclosed quotation mark. Please check your CSV file.');row.push(cell);rows.push(row);const nonempty=rows.filter(r=>r.some(c=>c.trim()));if(nonempty.length>501)throw Error('Upload at most 500 employees at a time.');const headers=nonempty[0]?.map(c=>c.replace(/^﻿/,'').trim().toLowerCase())||[];let column=headers.findIndex(c=>['name','employee name','full name','employee_name'].includes(c));const hasHeader=column>=0;if(!hasHeader)column=0;if(!hasHeader&&nonempty.some(r=>r.length>1))throw Error('For multiple columns include an Employee Name header.');const seen=new Set(existing.map(n=>n.trim().toLocaleLowerCase()));return nonempty.slice(hasHeader?1:0).map((r,i)=>{const name=(r[column]||'').replace(/^﻿/,'').trim().replace(/\s+/g,' ');let issue='';const key=name.toLocaleLowerCase();if(!name)issue='Name required';else if(name.length>120||/[<>\x00-\x1f]/.test(name)||/^[=+@]/.test(name))issue='Invalid name';else if(seen.has(key))issue='Duplicate name — review separately';if(!issue)seen.add(key);return {name,row:i+(hasHeader?2:1),issue}})}

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
const employmentTypes=['Permanent executive','Permanent non-executive','Fixed-term contract','Agency contract','Apprentice / trainee'];
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
const fieldRole=record=>/field|project|expansion/i.test((record.dept||'')+' '+(record.designation||''));
const operationsRole=record=>/operation|utilit|maintenance|refinery|production|quality/i.test((record.dept||'')+' '+(record.designation||''));

/* The working pattern follows the role, not the person. */
function workPattern(record){
const category=categoryOf(record);
if(category==='Apprentice')return {shift:'General',hours:'09:00–16:30',weekly:36,off:'Saturday and Sunday',scheme:'Training attendance'};
if(fieldRole(record))return {shift:'Field duty',hours:'08:00–17:00',weekly:45,off:'By field roster',scheme:'Field attendance'};
if(category==='Executive')return {shift:'General',hours:'09:00–17:30',weekly:42.5,off:'Saturday and Sunday',scheme:'General attendance'};
if(operationsRole(record))return {shift:'Rotating',hours:'8 hours per shift, three shifts',weekly:42,off:'By shift roster',scheme:'Shift attendance'};
return {shift:'General',hours:'09:00–17:30',weekly:42.5,off:'Saturday and Sunday',scheme:'General attendance'}}

function probationEnd(record){
const start=record.joiningDate;if(!start)return '';
const months=employmentOf(record)==='Permanent'?12:6;
const date=new Date(start+'T00:00:00Z');
date.setUTCMonth(date.getUTCMonth()+months);
return date.toISOString().slice(0,10)}

/* The draft a person reviews before any profile is created. */
function draftProfile(record){
const pattern=workPattern(record);
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
shift:pattern.shift,
grade:record.grade||'',
employment,
workHours:pattern.hours,
weeklyHours:pattern.weekly,
weeklyOff:pattern.off,
attendanceScheme:pattern.scheme,
joiningDate:record.joiningDate||'',
probationEnd:probationEnd(record),
manager:record.manager||'Not recorded',
payrollGroup:category==='Agency worker'?'Agency billing, not PSU payroll':category+' payroll, monthly',
leaveEntitlement:entitled?'PSU leave rules for '+category.toLowerCase():'Agency contract terms, no PSU leave entitlement',
access:['HRMS self-service','Attendance','Payroll documents'].concat(category==='Executive'?['Team approvals']:[]).concat(pattern.shift==='Rotating'?['Shift roster']:[]),
training:[{name:'Safety induction',due:record.joiningDate||'',renewal:'12 months'}].concat(operationsRole(record)?[{name:'Unit-specific operations training',due:record.joiningDate||'',renewal:'24 months'}]:[]).concat(fieldRole(record)?[{name:'Work-at-height and field safety',due:record.joiningDate||'',renewal:'12 months'}]:[]),
source:'Drafted from onboarding case '+record.id}}

function ensureRecord(record){
if(!record.stage)record.stage=1;
if(!record.items)record.items={};
if(!record.history)record.history=[];
if(record.screening===undefined)record.screening=true;
if(record.acceptance===undefined)record.acceptance=null;
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

sample(12,{name:'Nabanita Devi',designation:'Procurement Officer',dept:'Materials and procurement',email:'nabanita.devi@example.invalid',phone:'+91 90000 10012',dob:'1996-10-09',joiningDate:'2026-11-30',stage:3,acceptance:'Yes',security:true},2,
{d_identity:{state:'Verified'},d_education:{state:'Verified'},d_bank:{state:'Submitted'},c_medical:{state:'Verified'},s_agreement:{state:'Verified'},c_security:{state:'Submitted',note:'Security clearance request sent to the competent authority'}},
[['30/10/2026, 9:30 am','Stage advanced to Pre-joining in progress'],['28/10/2026, 2:10 pm','Offer accepted. Joining date confirmed.'],['22/10/2026, 10:12 am','Offer issued. Offer email sent to the joiner with one link.']])]}

const model={stages,checklist,groups,states,employmentTypes,proposalStates,applicable,itemState,summary,canAdvance,samples,proposalOf,askJoiner,joinerResponse,acceptProposedDate,nextEmployeeId,draftProfile,workPattern,parse};
if(typeof module!=='undefined')module.exports=Object.assign({parse},model);
if(!global.document)return;
global.Onboarding=model;

/* ---------------------------------------------------------------------------
   HR interface. HR officer only. Fictional data, saved in this browser.
--------------------------------------------------------------------------- */
let preview=[],fileName='',reading=0;
const permitted=()=>role==='HR officer'&&!signedOut;
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
seedSamples();
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
<div class="onboard-intro"><div><span class="eyebrow">HR INTAKE</span><h3>From offer to active employee, in one chain.</h3><p>One onboarding case, one checklist. HR sees only exceptions by default. A person approves every step; nothing is paid, approved, or sent by the system alone.</p></div><div class="actions">${btn('Add new employee',"onboardingNew()",'primary')}${btn('Upload employee list',"onboardingUpload()")}</div></div>
<div class="onboard-note">Eight stages: offer issued · offer accepted · pre-joining · ready to join · reported for joining · active employee · induction · onboarding complete. Records are saved in this browser. Use sample names in this demo.</div>
<div class="onb-metrics">${metrics.map(([label,value,note])=>`<div class="stat"><div class="stathead">${label}<span>→</span></div><strong>${value}</strong><small>${note}</small></div>`).join('')}</div>
<div class="toolbar">${tabs}${btn('Export cases (CSV)',"onboardingExport()")}${btn('Reload sample joiners',"onboardingReseed()")}${btn('Download CSV template',"download('onboarding-template.csv','Employee Name\\nAditi Roy\\nRohan Sen\\n')")}</div>
${filtered.length?`<div class="tablewrap"><table><thead><tr><th>EMPLOYEE</th><th>CASE</th><th>STAGE</th><th>STATUS</th><th>WHAT IS MISSING</th><th>OWNER</th><th></th></tr></thead><tbody>${filtered.map(({r,s})=>`<tr><td><strong data-i18n-user>${esc(r.name)}</strong><br><small>${esc(r.designation||'Designation not recorded')}</small></td><td>${esc(caseRef(r.id))}<br><small>${r.joiningDate?'Joining '+esc(r.joiningDate):'Joining date not set'}</small></td><td>${r.stage}/8 · ${esc(stageName(r.stage))}</td><td>${chip(s.status,tone(s.status))}</td><td><small>${esc(s.reason||'Nothing outstanding')}</small></td><td><small data-i18n-user>${esc(r.coordinator||r.by||'Unassigned')}</small></td><td>${btn('Open →',`onboardingDetail('${r.id}')`,'link')}</td></tr>`).join('')}</tbody></table></div>`:`<div class="empty">${all.length?'No cases in this view. Switch to All to see every case.':'No onboarding cases yet. Add a new employee or upload a list to begin.'}</div>`}
<div class="cardfoot">${all.length} onboarding cases · ${rows.filter(x=>x.s.status==='Blocked').length} blocked · Every question, reply and upload is logged with date and owner.</div>`)};

global.onboardingView=function(v){if(!permitted())return;state.onboardingView=v;render()};

global.onboardingReseed=function(){if(!permitted())return;
const own=records().filter(r=>!r.sample).length;
modal('Reload sample joiners',`<p>This replaces the twelve fictional sample cases with fresh copies, so the screens show the original spread of stages and exceptions.</p><p class="sub">${own?own+' case(s) you created here are kept and are not changed.':'No cases created here, so nothing of your own is affected.'} Changes made to the sample cases in this browser are discarded.</p>`,
btn('Cancel',"$('#dialog').close()")+btn('Reload samples',"onboardingReseedConfirm()",'primary'))};

global.onboardingReseedConfirm=function(){if(!permitted())return;
const previous=state.onboarding||[];
state.onboarding=[...previous.filter(r=>!r.sample),...samples()];
if(!persist('Sample onboarding cases reloaded',()=>{state.onboarding=previous}))return;
$('#dialog').close();render();toast('Sample joiners reloaded.')};

global.onboardingExport=function(){if(!permitted())return;
const rows=records().map(r=>{const s=summary(r);return [r.id,r.name,r.designation||'',r.employmentType||'',r.joiningDate||'',r.stage+'/8',stageName(r.stage),s.status,s.missing.join('; '),r.coordinator||'']});
download('onboarding-cases.csv',[['Case ID','Employee','Designation','Employment type','Joining date','Stage','Stage name','Status','Outstanding','Coordinator'],...rows].map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\n'))};

/* ---------- new employee information ---------- */
const flagRow=(id,label,on)=>`<label class="onb-flag"><input type="checkbox" id="${id}" ${on?'checked':''}><span>${label}</span></label>`;

global.onboardingNew=function(existingId){if(!permitted())return;
const r=existingId?find(existingId):null;
modal(r?'Employee information':'Add new employee',`
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
global.onboardingDetail=function(id){if(!permitted())return;const r=find(id);if(!r)return;
const s=summary(r),adv=canAdvance(r),next=stages[r.stage];
const track=stages.map(st=>`<li class="${r.stage>st.n?'done':r.stage===st.n?'current':''}"><span>${st.n}</span><strong>${st.name}</strong></li>`).join('');
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
const stageAction=r.stage===1&&r.acceptance!=='Yes'?`${btn('Record acceptance: Yes',`onboardingAcceptance('${r.id}','Yes')`,'primary')}${btn('Record acceptance: No',`onboardingAcceptance('${r.id}','No')`)}`:'';

/* Joining date and relocation, confirmed with the joiner during pre-joining. */
function confirmPanel(r){
if(r.stage<3||r.acceptance==='No')return '';
const p=proposalOf(r),asked=p.state!=='Not asked';
const answered=p.state==='Accepted';
const rows=[['Relocation',p.relocation||'Not answered yet'],['Proposed joining date',p.date||'Not proposed'],['Joiner response',p.state]];
if(p.proposed.length)rows.push(['Dates suggested by the joiner',p.proposed.join(' · ')]);
if(p.note)rows.push(['Joiner note',p.note]);
const actions=r.stage>3?'':p.state==='Not asked'?btn('Ask the joiner to confirm',`onboardingAskJoining('${r.id}')`,'primary')
:p.state==='Awaiting joiner'?btn('Record the joiner response',`onboardingJoinerReply('${r.id}')`,'primary')+btn('Change the proposed date',`onboardingAskJoining('${r.id}')`)
:p.state==='Alternative proposed'?btn('Review the suggested dates',`onboardingReviewDates('${r.id}')`,'primary')
:btn('Reopen the confirmation',`onboardingAskJoining('${r.id}')`);
return `<h3>Joining confirmation</h3>
<p class="sub">The joiner answers the relocation question and either accepts the proposed joining date or suggests other dates. HR reviews any suggestion. The case reaches Ready to join only once both are settled.</p>
${answered?`<div class="callout">Joining date ${esc(p.date)} accepted by the joiner. Relocation: ${esc(p.relocation||'not answered')}.</div>`:asked?'':'<div class="callout">The joiner has not been asked yet. The joining date on the offer is a proposal until the joiner accepts it.</div>'}
${profilePairs(rows)}
<div class="toolbar onb-actions">${actions}</div>`}

/* The employee identifier and the profile drafted for HR to approve. */
function profilePanel(r){
if(r.stage<4||r.acceptance==='No')return '';
const draft=r.profile;
return `<h3>Employee record</h3>
${r.employeeId?`<div class="callout">Employee identifier <strong>${esc(r.employeeId)}</strong> was issued when this case reached Ready to join.</div>`:'<div class="callout">No employee identifier issued yet.</div>'}
${draft?`<p class="sub">Profile created in the HRMS portal on ${esc(draft.createdOn)} by ${esc(draft.createdBy)}, from the draft reviewed in this case.</p>${profilePairs([['Employee ID',draft.id],['Working pattern',draft.shift],['Work hours',draft.workHours],['Hours per week',String(draft.weeklyHours)],['Weekly off',draft.weeklyOff],['Attendance scheme',draft.attendanceScheme],['Probation ends',draft.probationEnd||'Not applicable'],['Payroll group',draft.payrollGroup],['Leave entitlement',draft.leaveEntitlement],['Access',draft.access.join(', ')],['Training',draft.training.map(t=>t.name).join(', ')]])}<div class="toolbar onb-actions">${btn('Open in People & Service Records',`onboardingOpenProfile('${r.id}')`)}</div>`
:`<p class="sub">The profile agent drafts the working pattern, payroll group, leave entitlement, access and training from this case. HR reviews the draft before any profile is created.</p><div class="toolbar onb-actions">${btn('Draft the employee profile',`onboardingDraftProfile('${r.id}')`,'primary')}</div>`}`}
modal('Onboarding case',`
<h3 data-i18n-user>${esc(r.name)}</h3>
<div class="onb-head">${chip(s.status,tone(s.status))}<span class="onb-progress"><i style="width:${s.percent}%"></i></span><small>${s.done} of ${s.total} checklist items cleared</small></div>
${r.needsInfo?`<div class="callout">Employee information is incomplete for this case. ${btn('Add employee information',`onboardingNew('${r.id}')`,'link')}</div>`:''}
${r.acceptance==='No'?'<div class="callout">The joiner declined the offer. The case is stopped and onboarding does not start.</div>':''}
<ol class="onb-track">${track}</ol>
<p class="sub">${esc(stages[r.stage-1].note)}</p>
<div class="toolbar onb-actions">${stageAction}${r.acceptance!=='No'&&r.stage>1&&next?btn('Advance to '+next.name,`onboardingAdvance('${r.id}')`,adv.ok?'primary':''):''}${btn('Edit information',`onboardingNew('${r.id}')`)}</div>
${adv.ok||r.stage===1?'':`<div class="callout">Cannot advance yet. ${esc(adv.reason)}</div>`}
${confirmPanel(r)}
${profilePanel(r)}
<h3>Employee information</h3>${info}
<h3>Checklist</h3>
<p class="sub">Verification runs document by document. A failed document does not stop the other documents, unless it is a hard block.</p>
${groupBlocks}
<h3>Activity history</h3>
<div class="onb-history">${r.history.map(e=>`<p><small data-i18n-user>${esc(e.date)} · ${esc(e.by||'')} · ${esc(e.action)}</small></p>`).join('')}</div>`,
btn('Close',"$('#dialog').close()"))};

global.onboardingAcceptance=function(id,answer){if(!permitted())return;const r=find(id);if(!r||r.stage!==1)return;
const previous=structuredClone(state.onboarding);
r.acceptance=answer;
if(answer==='Yes'){r.stage=2;log(r,'Offer accepted. Joining date confirmed. Portal link for documents sent to the joiner.')}
else log(r,'Offer declined by the joiner. Case stopped; onboarding does not start.');
if(!persist('Offer acceptance recorded for '+r.name+': '+answer,()=>{state.onboarding=previous}))return;
render();onboardingDetail(id);toast(answer==='Yes'?'Acceptance recorded. Document filling can start.':'Decline recorded. The case is stopped.')};

global.onboardingAdvance=function(id){if(!permitted())return;const r=find(id);if(!r)return;
const check=canAdvance(r);
if(!check.ok)return toast(check.reason);
const next=stages[r.stage];if(!next)return;
modal('Advance this case',`<p>Move <strong data-i18n-user>${esc(r.name)}</strong> from <strong>${esc(stageName(r.stage))}</strong> to <strong>${esc(next.name)}</strong>?</p><p class="sub">${esc(next.note)}</p><label class="field full">Note for the history (optional)<input id="onbAdvanceNote" maxlength="160"></label>`,
btn('Cancel',`onboardingDetail('${id}')`)+btn('Confirm',`onboardingAdvanceConfirm('${id}')`,'primary'))};

global.onboardingAdvanceConfirm=function(id){if(!permitted())return;const r=find(id);if(!r)return;
const check=canAdvance(r);if(!check.ok)return toast(check.reason);
const note=val('onbAdvanceNote'),previous=structuredClone(state.onboarding);
r.stage=Math.min(8,r.stage+1);
log(r,'Stage advanced to '+stageName(r.stage)+(note?' · '+note:''));
if(r.stage>=4&&!r.employeeId){issueEmployeeId(r);log(r,'Employee identifier '+r.employeeId+' issued on reaching Ready to join')}
if(!persist('Onboarding stage advanced for '+r.name+' to '+stageName(r.stage),()=>{state.onboarding=previous}))return;
render();onboardingDetail(id);toast('Stage advanced to '+stageName(r.stage)+'.')};

/* ---------- joining confirmation ---------- */
const setItem=(record,itemId,state,note)=>{record.items[itemId]=Object.assign(record.items[itemId]||{},{state,note:note||'',by:person().name,date:now()})};

global.onboardingAskJoining=function(id){if(!permitted())return;const r=find(id);if(!r)return;
const p=proposalOf(r);
modal('Ask the joiner to confirm',`<p>Send <strong data-i18n-user>${esc(r.name)}</strong> the proposed joining date and the relocation question. The joiner can accept the date or suggest other dates.</p>
<label class="field full">Proposed joining date<input id="onbProposeDate" type="date" value="${esc(p.date||r.joiningDate||'')}"></label>
<p class="sub">Relocation is asked as a question, not assumed. The answer decides whether travel, accommodation and transport appear on this checklist.</p>`,
btn('Cancel',`onboardingDetail('${id}')`)+btn('Send to the joiner',`onboardingAskJoiningSave('${id}')`,'primary'))};

global.onboardingAskJoiningSave=function(id){if(!permitted())return;const r=find(id);if(!r)return;
const date=val('onbProposeDate');
if(!date)return toast('Enter the proposed joining date.');
if(r.offerDate&&date<r.offerDate)return toast('The joining date cannot be before the offer date.');
const previous=structuredClone(state.onboarding);
askJoiner(r,date);
setItem(r,'k_relocation','Submitted','Relocation question sent to the joiner');
setItem(r,'k_joindate','Submitted','Joining date '+date+' proposed to the joiner');
log(r,'Joining date '+date+' and the relocation question sent to the joiner');
if(!persist('Joining confirmation requested for '+r.name,()=>{state.onboarding=previous}))return;
render();onboardingDetail(id);toast('Sent to the joiner. Awaiting the response.')};

global.onboardingJoinerReply=function(id){if(!permitted())return;const r=find(id);if(!r)return;
const p=proposalOf(r);
modal('Record the joiner response',`<p class="sub">Recorded as received from <strong data-i18n-user>${esc(r.name)}</strong>. HR records the answer; the joiner does not change the case directly in this demonstration.</p>
<h3>Relocation</h3>
<div class="onb-flags">
<label class="onb-flag"><input type="radio" name="onbReloc" id="onbRelocNeeded" ${r.relocating?'checked':''}><span>Relocation is needed</span></label>
<label class="onb-flag"><input type="radio" name="onbReloc" id="onbRelocNot" ${r.relocating?'':'checked'}><span>Relocation is not needed</span></label>
</div>
<h3>Joining date</h3>
<div class="onb-flags">
<label class="onb-flag"><input type="radio" name="onbDateAnswer" id="onbDateAccept" checked onchange="onboardingToggleDates()"><span>Accepts ${esc(p.date||r.joiningDate||'the proposed date')}</span></label>
<label class="onb-flag"><input type="radio" name="onbDateAnswer" id="onbDatePropose" onchange="onboardingToggleDates()"><span>Suggests other dates for HR to review</span></label>
</div>
<div id="onbDateOptions" hidden><div class="formgrid">
<label class="field">First preference<input id="onbAlt1" type="date"></label>
<label class="field">Second preference<input id="onbAlt2" type="date"></label>
</div></div>
<label class="field full">Note from the joiner (optional)<input id="onbJoinerNote" maxlength="160" placeholder="e.g. Notice period ends on 10 December"></label>`,
btn('Cancel',`onboardingDetail('${id}')`)+btn('Record response',`onboardingJoinerReplySave('${id}')`,'primary'))};

global.onboardingToggleDates=function(){const box=$('#onbDateOptions');if(box)box.hidden=!$('#onbDatePropose')?.checked};

global.onboardingJoinerReplySave=function(id){if(!permitted())return;const r=find(id);if(!r)return;
const accepts=!!$('#onbDateAccept')?.checked;
const proposed=[val('onbAlt1'),val('onbAlt2')].filter(Boolean);
if(!accepts&&!proposed.length)return toast('Enter at least one date suggested by the joiner.');
if(!accepts&&r.offerDate&&proposed.some(d=>d<r.offerDate))return toast('A suggested date cannot be before the offer date.');
const previous=structuredClone(state.onboarding);
const relocation=$('#onbRelocNeeded')?.checked?'Needed':'Not needed';
const note=val('onbJoinerNote');
const p=joinerResponse(r,{relocation,accepts,proposed,note});
setItem(r,'k_relocation','Verified','Joiner answered: relocation '+relocation.toLowerCase());
if(accepts){setItem(r,'k_joindate','Verified','Joining date '+p.date+' accepted by the joiner');log(r,'Joiner accepted the joining date '+p.date+'. Relocation '+relocation.toLowerCase()+'.')}
else{setItem(r,'k_joindate','Submitted','Joiner suggested '+proposed.join(' or ')+'. Awaiting HR review.');log(r,'Joiner suggested '+proposed.join(' or ')+' instead of '+p.date+'. Awaiting HR review.')}
if(note)log(r,'Note from the joiner: '+note);
if(!persist('Joiner response recorded for '+r.name,()=>{state.onboarding=previous}))return;
render();onboardingDetail(id);toast(accepts?'Joining date accepted.':'Suggested dates recorded for HR review.')};

global.onboardingReviewDates=function(id){if(!permitted())return;const r=find(id);if(!r)return;
const p=proposalOf(r);
modal('Review the suggested dates',`<p><strong data-i18n-user>${esc(r.name)}</strong> did not accept ${esc(p.date)} and suggested the dates below.</p>
${p.note?`<div class="callout" data-i18n-user>Note from the joiner: ${esc(p.note)}</div>`:''}
<div class="toolbar onb-actions">${p.proposed.map(d=>btn('Accept '+d,`onboardingAcceptDate('${id}','${d}')`,'primary')).join('')}</div>
<p class="sub">Or propose a different date, which goes back to the joiner for acceptance.</p>
<label class="field full">Different date<input id="onbProposeDate" type="date" value="${esc(p.proposed[0]||'')}"></label>`,
btn('Cancel',`onboardingDetail('${id}')`)+btn('Propose this date instead',`onboardingAskJoiningSave('${id}')`))};

global.onboardingAcceptDate=function(id,date){if(!permitted())return;const r=find(id);if(!r)return;
const previous=structuredClone(state.onboarding);
acceptProposedDate(r,date);
setItem(r,'k_joindate','Verified','Joining date '+date+' agreed after HR review');
log(r,'HR accepted the joining date '+date+' suggested by the joiner');
if(!persist('Joining date agreed for '+r.name+': '+date,()=>{state.onboarding=previous}))return;
render();onboardingDetail(id);toast('Joining date set to '+date+'.')};

/* ---------- employee identifier and profile ---------- */
function issueEmployeeId(record){
if(record.employeeId)return record.employeeId;
const taken=people.map(p=>p.id).concat(records().map(r=>r.employeeId).filter(Boolean));
record.employeeId=nextEmployeeId(record,taken);
return record.employeeId}

global.onboardingDraftProfile=function(id){if(!permitted())return;const r=find(id);if(!r)return;
if(!r.employeeId)return toast('The employee identifier is issued at Ready to join.');
const draft=draftProfile(r);
modal('Employee profile draft',`<p class="sub">Drafted from onboarding case ${esc(r.id)} by the profile agent. Nothing is created until HR approves this draft. Review the working pattern and entitlement before approving.</p>
${profilePairs([['Employee ID',draft.id],['Name',draft.name],['Designation',draft.job],['Category',draft.category],['Department',draft.dept],['Work location',draft.location],['Employment',draft.employment],['Grade',draft.grade||'Not recorded'],['Working pattern',draft.shift],['Work hours',draft.workHours],['Hours per week',String(draft.weeklyHours)],['Weekly off',draft.weeklyOff],['Attendance scheme',draft.attendanceScheme],['Joining date',draft.joiningDate||'Not confirmed'],['Probation ends',draft.probationEnd||'Not applicable'],['Reporting manager',draft.manager],['Payroll group',draft.payrollGroup],['Leave entitlement',draft.leaveEntitlement],['Access',draft.access.join(', ')],['Training',draft.training.map(t=>t.name+' (renew every '+t.renewal+')').join(' · ')]])}
<div class="callout">Approving adds this profile to People &amp; Service Records in this browser. No payroll, attendance device, or external system is written.</div>`,
btn('Cancel',`onboardingDetail('${id}')`)+btn('Approve and create profile',`onboardingCreateProfile('${id}')`,'primary'))};

global.onboardingCreateProfile=function(id){if(!permitted())return;const r=find(id);if(!r)return;
if(!r.employeeId)return toast('The employee identifier is issued at Ready to join.');
if(r.profile)return toast('A profile already exists for this case.');
const previousCases=structuredClone(state.onboarding),previousProfiles=structuredClone(state.hrmsProfiles||[]);
const draft=draftProfile(r);
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
modal('Update checklist item',`<h3>${esc(item.name)}</h3><p class="sub">${esc(item.group)} · from stage ${item.stage}${item.hard?' · hard block':''}</p>
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
modal('Ask a question',`<h3>${esc(item.name)}</h3><p class="sub">The joiner sees the question in the case, replies, and uploads the correct document. Every question, reply and upload is logged with date and owner.</p>
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
global.onboardingUpload=function(){if(!permitted())return;preview=[];fileName='';reading++;modal('Upload employee list',`<p>Create one onboarding case per name. Employee information can be completed on each case afterwards.</p><label class="field">Employee list<input id="onboardFile" type="file" accept=".csv,.txt,text/csv,text/plain" onchange="onboardingRead(this.files[0])"></label><p class="sub">Maximum 200 KB and 500 employees. Excel files: save as CSV first.</p><div id="onboardPreview" aria-live="polite"></div>`,btn('Cancel',"$('#dialog').close()")+`<button class="primary" id="onboardStart" onclick="onboardingStart()" disabled>Start onboarding</button>`)};

global.onboardingRead=async function(file){if(!permitted())return;const token=++reading;preview=[];$('#onboardStart').disabled=true;if(!file)return;fileName=file.name;try{if(!/\.(csv|txt)$/i.test(file.name))throw Error('Choose a CSV or TXT file.');if(file.size>200000)throw Error('Use a file smaller than 200 KB.');const content=await file.text();if(token!==reading||!permitted()||!$('#onboardPreview'))return;preview=parse(content,records().map(r=>r.name));const valid=preview.filter(r=>!r.issue);$('#onboardPreview').innerHTML=`<h3>Review ${esc(fileName)}</h3><p>${valid.length} ready · ${preview.length-valid.length} excluded</p><p class="sub">Duplicates and invalid rows will be skipped. Namesakes can be reviewed separately when employee identifiers are added.</p><div class="tablewrap" style="max-height:280px;overflow:auto"><table><thead><tr><th>ROW</th><th>EMPLOYEE NAME</th><th>RESULT</th></tr></thead><tbody>${preview.map(r=>`<tr><td>${r.row}</td><td data-i18n-user>${esc(r.name)}</td><td>${r.issue?esc(r.issue):'Ready'}</td></tr>`).join('')}</tbody></table></div>`;$('#onboardStart').disabled=!valid.length;$('#onboardStart').textContent='Start onboarding ('+valid.length+')'}catch(e){if(token===reading&&$('#onboardPreview'))$('#onboardPreview').textContent=e.message}};

global.onboardingStart=function(){if(!permitted()||!preview.length)return;const existing=new Set(records().map(r=>r.name.toLocaleLowerCase()));const ready=preview.filter(r=>!r.issue&&!existing.has(r.name.toLocaleLowerCase()));if(!ready.length)return;const previous=state.onboarding||[];const stamp=now();const batch=crypto.randomUUID();
const created=ready.map(r=>{const record=ensure({id:'ONB-'+crypto.randomUUID(),batch,name:r.name,started:stamp,by:person().name,stage:1,acceptance:null,items:{},history:[],needsInfo:true,coordinator:person().name,screening:true,experienced:true});log(record,'Offer issued from the uploaded employee list. Employee information is incomplete.');return record});
state.onboarding=[...created,...previous];
if(!persist('Onboarding batch initiated: '+created.length+' employees',()=>{state.onboarding=previous}))return;
preview=[];$('#dialog').close();render();toast(created.length+' onboarding cases created. Complete the employee information on each case.')};
})(typeof window!=='undefined'?window:globalThis);
