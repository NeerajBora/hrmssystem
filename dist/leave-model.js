/* Leave catalogue and balance rules, shared by the UI and automated checks. */
(function(root,factory){const model=factory();if(typeof module==='object'&&module.exports)module.exports=model;else root.LeaveModel=model})(typeof window!=='undefined'?window:globalThis,function(){
const types=[
{id:'annual',name:'Annual Leave',group:'Personal Leave',quota:18},
{id:'casual',name:'Casual Leave',group:'Personal Leave',quota:6},
{id:'comp_off',name:'Compensatory Off',group:'Personal Leave',quota:0},
{id:'covid',name:'Covid Leave',group:'Personal Leave',quota:0},
{id:'absence',name:'Leave of Absence',group:'Personal Leave',mode:'approval'},
{id:'lop',name:'Loss of Pay',group:'Personal Leave',mode:'unpaid'},
{id:'relocation',name:'Relocation Leave',group:'Personal Leave',quota:0},
{id:'sick',name:'Sick Leave',group:'Personal Leave',quota:8},
{id:'volunteer',name:'Volunteer Leave',group:'Personal Leave',quota:1},
{id:'adoption',name:'Adoption Leave',group:'Family Leave',quota:0},
{id:'bereavement',name:'Bereavement Leave',group:'Family Leave',quota:3},
{id:'family_planning',name:'Family Planning Surgery Leave',group:'Family Leave',quota:0},
{id:'marriage',name:'Marriage Leave',group:'Family Leave',quota:3},
{id:'paternity',name:'Paternity Leave',group:'Family Leave',quota:0},
{id:'floater',name:'Floater Leave',group:'Time Off',quota:2},
{id:'evening',name:'Evening Shift',group:'Shift & On-Call Allowance',mode:'allowance'},
{id:'evening_holiday',name:'Evening Shift - Weekly Off & Public Holidays',group:'Shift & On-Call Allowance',mode:'allowance'},
{id:'morning_holiday',name:'Morning Shift - Weekly Off & Public Holidays',group:'Shift & On-Call Allowance',mode:'allowance'},
{id:'night_holiday',name:'Night Shift - Weekly Off & Public Holidays',group:'Shift & On-Call Allowance',mode:'allowance'}
];
const get=id=>types.find(t=>t.id===id);
function eligible(people,id){const p=people.find(p=>p.id===id);return !!p&&p.employment!=='Agency contract'}
function ensure(state,people,id){if(!eligible(people,id))return null;state.leaveBalances??={};if(!state.leaveBalances[id]){state.leaveBalances[id]={};for(const t of types.filter(t=>Number.isFinite(t.quota)))state.leaveBalances[id][t.id]=t.id==='annual'&&Number.isFinite(state.balances?.[id])?Math.max(0,state.balances[id]):t.quota;state.balances??={};state.balances[id]=state.leaveBalances[id].annual}return state.leaveBalances[id]}
function ledger(state,people,id,typeId,excludeId=''){const type=get(typeId);if(!type)return {configured:false,balance:null,pending:0,available:null};const b=ensure(state,people,id);if(!b)return {configured:false,type,balance:null,pending:0,available:null};if(!Number.isFinite(type.quota))return {configured:true,type,balance:null,pending:0,available:null};const balance=Math.max(0,Number(b[type.id])||0),pending=(state.requests||[]).filter(r=>r.id!==excludeId&&r.person===id&&r.type==='Leave'&&(r.leaveType||'annual')===type.id&&['Pending','Verification'].includes(r.status)).reduce((sum,r)=>sum+(Number(r.days)||0),0);return {configured:true,type,balance,pending,available:Math.max(0,balance-pending)}}
function countDays(from,to){if(!/^\d{4}-\d{2}-\d{2}$/.test(from||'')||!/^\d{4}-\d{2}-\d{2}$/.test(to||''))return 0;const a=Date.parse(from+'T00:00:00Z'),b=Date.parse(to+'T00:00:00Z');if(!Number.isFinite(a)||!Number.isFinite(b)||new Date(a).toISOString().slice(0,10)!==from||new Date(b).toISOString().slice(0,10)!==to)return 0;return Math.round((b-a)/86400000)+1}
function validate(state,people,data,{excludeId='',draft=false,approval=false}={}){const type=get(data.leaveType===undefined?'annual':data.leaveType);if(!type)return {ok:false,code:'type',message:'Select a leave type.'};const entry=ledger(state,people,data.person,type.id,excludeId),days=countDays(data.from,data.to);if(draft)return {ok:true,type,entry,days:Math.max(0,days)};if(!entry.configured)return {ok:false,code:'unconfigured',type,entry,message:'Leave entitlements are not configured for this employee.'};if(days<1)return {ok:false,code:'dates',type,entry,message:'End date must be on or after start date.'};if(days>(Number(state.policies?.leave)||30))return {ok:false,code:'policy',type,entry,days,message:'This request exceeds the configured maximum request length.'};if(entry.available!==null&&entry.available===0)return {ok:false,code:'exhausted',type,entry,days,message:'Leave exhausted'};if(entry.available!==null&&days>entry.available)return {ok:false,code:'insufficient',type,entry,days,message:'Insufficient leave balance'};if(type.mode!=='allowance'&&(state.requests||[]).some(r=>r.id!==excludeId&&r.person===data.person&&r.type==='Leave'&&['Pending','Approved'].includes(r.status)&&data.from<=r.to&&data.to>=r.from))return {ok:false,code:'overlap',type,entry,days,message:'These dates overlap an existing leave request.'};return {ok:true,type,entry,days}}
function approve(state,people,request){if(request.leaveProcessed)return {ok:false,code:'duplicate',message:'This leave request has already been processed.'};const result=validate(state,people,request,{excludeId:request.id,approval:true});if(!result.ok)return result;if(result.entry.available!==null){state.leaveBalances[request.person][result.type.id]-=result.days;if(result.type.id==='annual')state.balances[request.person]=state.leaveBalances[request.person].annual}request.leaveProcessed=true;request.leaveType=result.type.id;request.leaveTypeName=result.type.name;return result}
return {types,get,eligible,ensure,ledger,countDays,validate,approve};
});
