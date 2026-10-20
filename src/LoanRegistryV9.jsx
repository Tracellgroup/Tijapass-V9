import React, {useEffect,useState} from 'react';
import {externalLoanSchedule,externalDebt,internalDebt} from './creditV9.js';
import {validateExternalLoan} from './externalLoanV9.js';
const money=n=>'TZS '+new Intl.NumberFormat('en-TZ',{maximumFractionDigits:0}).format(Math.round(Number(n)||0));
const now=()=>new Date().toISOString().slice(0,10);
const makeId=()=>`EXT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6)}`;
const formDefault={lender:'',reference:'',balance:'',installment:'',frequency:'Monthly',remainingInstallments:'',nextDueDate:'',evidenceNote:'',status:'Customer declared'};
const txt=(sw,en,lang)=>lang==='sw'?sw:en;
export default function LoanRegistryV9({data,customer,role,mutate,audit,notify,addNotification,language='en'}){
 const admin=role==='TFL Admin';
 const [entry,setEntry]=useState({...formDefault});
 const [selected,setSelected]=useState('');
 const [revision,setRevision]=useState({...formDefault});
 const [reason,setReason]=useState('');
 const [showSchedule,setShowSchedule]=useState(null);
 const rows=(data.externalLoans||[]).filter(l=>l.customerId===customer.id&&l.status!=='Archived');
 const chosen=rows.find(l=>l.id===selected);
 useEffect(()=>{if(!admin)return; if(chosen)setRevision({...chosen});},[selected,chosen?.updatedAt,admin]);
 const ext=externalDebt(data,customer.id),int=internalDebt(data,customer.id);
 const lang=language;
 function submit(){
  const errors=validateExternalLoan(entry);
  if(errors.length)return notify(errors[0],'error');
  const record={...entry,id:makeId(),customerId:customer.id,status:'Customer declared',balance:Number(entry.balance),installment:Number(entry.installment),remainingInstallments:Number(entry.remainingInstallments),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),enteredBy:'Customer',revision:1,history:[]};
  mutate(next=>{
   next.externalLoans=next.externalLoans||[];
   next.externalLoans.unshift(record);
   audit(next,'Customer','Declared existing external loan',record.id);
   addNotification(next,{role:'TFL Admin',entityId:'FI-TFL',severity:'warning',title:'External loan needs review',body:`${customer.businessName} declared ${money(record.balance)} from ${record.lender}. Verify schedule and supporting evidence.`});
  });
  setEntry({...formDefault});notify('External loan declared; TFL verification pending. You cannot change it after submission.');
 }
 function adminChange(archive=false){
  if(!chosen)return;
  if(String(reason).trim().length<10)return notify('TFL reviewer must provide a meaningful reason (10+ characters).','error');
  const candidate={...revision,status:archive?'Archived':revision.status||'Customer declared'};
  if(!archive){const errors=validateExternalLoan(candidate);if(errors.length)return notify(errors[0],'error');}
  mutate(next=>{
   const row=(next.externalLoans||[]).find(x=>x.id===chosen.id);
   row.history=row.history||[];
   row.history.push({at:new Date().toISOString(),by:'TFL Admin',reason,before:{...row,history:undefined}});
   Object.assign(row,{...candidate,balance:Number(candidate.balance),installment:Number(candidate.installment),remainingInstallments:Number(candidate.remainingInstallments),updatedAt:new Date().toISOString(),reviewedBy:'TFL Admin',reviewedAt:new Date().toISOString(),revision:(row.revision||1)+1});
   audit(next,'TFL Admin',archive?'Archived external loan declaration':'Corrected/verified external loan declaration',row.id+' — '+reason);
   addNotification(next,{role:'Customer',entityId:customer.id,title:archive?'External loan declaration archived':'External loan information reviewed',body:`TFL reviewed ${row.lender} (${row.id}). ${reason}`});
  });
  notify(archive?'External loan archived with audit history.':'TFL correction saved with previous values preserved.');
  setReason('');setSelected('');
 }
 const fields=(model,setter)=><div className="v9-form-grid">
  <label>{txt('Taasisi iliyokukopesha','Existing lender',lang)}<input value={model.lender} onChange={e=>setter(x=>({...x,lender:e.target.value}))} placeholder="Bank / SACCO / MFI" /></label>
  <label>{txt('Namba ya kumbukumbu (ikiwepo)','Loan reference (if known)',lang)}<input value={model.reference} onChange={e=>setter(x=>({...x,reference:e.target.value}))} /></label>
  <label>{txt('Salio la mkopo (TZS)','Outstanding principal (TZS)',lang)}<input type="number" min="1" value={model.balance} onChange={e=>setter(x=>({...x,balance:e.target.value}))}/></label>
  <label>{txt('Kiasi cha kila rejesho (TZS)','Each instalment (TZS)',lang)}<input type="number" min="1" value={model.installment} onChange={e=>setter(x=>({...x,installment:e.target.value}))}/></label>
  <label>{txt('Muda wa kurejesha','Repayment frequency',lang)}<select value={model.frequency} onChange={e=>setter(x=>({...x,frequency:e.target.value}))}><option value="Daily">{txt('Kila siku','Daily',lang)}</option><option value="Weekly">{txt('Kila wiki','Weekly',lang)}</option><option value="Monthly">{txt('Kila mwezi','Monthly',lang)}</option></select></label>
  <label>{txt('Marejesho yaliyobaki','Remaining instalments',lang)}<input type="number" min="1" max="1200" value={model.remainingInstallments} onChange={e=>setter(x=>({...x,remainingInstallments:e.target.value}))}/></label>
  <label>{txt('Tarehe ya rejesho lijalo','Next payment date',lang)}<input type="date" value={model.nextDueDate} onChange={e=>setter(x=>({...x,nextDueDate:e.target.value}))}/></label>
  <label>{txt('Ushahidi / maelezo','Evidence / supporting details',lang)}<input value={model.evidenceNote} onChange={e=>setter(x=>({...x,evidenceNote:e.target.value}))} placeholder="Statement or loan agreement reference"/></label>
 </div>;
 return <section className="v9-registry">
  <div className="section-title"><h2>{txt('Mikopo ya nje iliyopo','Existing loans from other lenders',lang)}</h2><p>{txt('Eleza mikopo ya benki, SACCOS, taasisi au mikopo mingine. Malipo yake yatapunguza uwezo wa kupata mkopo mpya.','Declare outstanding loans from banks, mobile lenders, SACCOs and other providers. Their repayments reduce your new-loan capacity.',lang)}</p></div>
  <div className="v9-loan-stats"><div><span>External principal</span><strong>{money(ext.balance)}</strong></div><div><span>External instalments / month</span><strong>{money(ext.monthly)}</strong></div><div><span>TijaPass principal</span><strong>{money(int.outstanding)}</strong></div><div><span>Combined debt</span><strong>{money(ext.balance+int.outstanding)}</strong></div></div>
  <div className="panel"><div className="panel-head"><h2>{txt('Orodha ya mikopo iliyopo','Declared external debts',lang)}</h2></div>
   <div className="table-wrap"><table><thead><tr><th>{txt('Mkopesha','Lender',lang)}</th><th>{txt('Salio','Balance',lang)}</th><th>{txt('Rejesho','Instalment',lang)}</th><th>{txt('Mzunguko','Frequency',lang)}</th><th>{txt('Muda uliobaki','Remaining',lang)}</th><th>{txt('Hali','Status',lang)}</th><th>Details</th></tr></thead><tbody>
    {rows.length?rows.map(l=><tr key={l.id}><td>{l.lender}</td><td>{money(l.balance)}</td><td>{money(l.installment)}</td><td>{l.frequency}</td><td>{l.remainingInstallments}</td><td>{l.status}</td><td><button className="mini-action" onClick={()=>setShowSchedule(showSchedule===l.id?null:l.id)}>{showSchedule===l.id?'Hide':'Schedule'}</button>{admin&&<button className="mini-action" onClick={()=>setSelected(l.id)} style={{marginLeft:6}}>TFL review</button>}</td></tr>):<tr><td colSpan="7">No external loans declared.</td></tr>}
   </tbody></table></div>
   {rows.filter(l=>l.id===showSchedule).map(l=><div key={l.id} className="v9-schedule"><strong>{l.lender} · {l.id} · Customer-entered plan (not externally verified)</strong><div className="table-wrap"><table><thead><tr><th>#</th><th>Due date</th><th>Amount due</th></tr></thead><tbody>{externalLoanSchedule(l).slice(0,60).map(r=><tr key={r.no}><td>{r.no}</td><td>{r.dueDate}</td><td>{money(r.amountDue)}</td></tr>)}</tbody></table></div>{l.remainingInstallments>60&&<small>Showing first 60 instalments of {l.remainingInstallments}.</small>}</div>)}
  </div>
  {!admin&&<div className="panel"><div className="panel-head"><h2>{txt('Ongeza mkopo uliopo','Declare an existing loan',lang)}</h2></div><p className="muted">{txt('Ukishatuma, huwezi kubadili au kufuta taarifa hizi mwenyewe. TFL itahakiki na kurekebisha inapohitajika.','Once submitted, only a TFL administrator can edit, verify or archive this entry. All changes are logged.',lang)}</p>{fields(entry,setEntry)}<button className="primary" onClick={submit}>{txt('Tuma mkopo uliopo','Submit external loan',lang)}</button></div>}
  {admin&&<div className="panel"><div className="panel-head"><h2>TFL loan verification and correction</h2></div>
    {!chosen?<p className="muted">Select an external debt above to correct, verify, or archive. The original remains in revision history.</p>:<>
    <p>{chosen.id} • Submitted by customer • Revision {chosen.revision||1}</p>
    {fields(revision,setRevision)}
    <label className="v9-review-label">Status<select value={revision.status} onChange={e=>setRevision(x=>({...x,status:e.target.value}))}><option value="Customer declared">Customer declared</option><option value="TFL reviewed">TFL reviewed</option><option value="Disputed">Disputed</option></select></label>
    <label className="v9-review-label">Required correction / archive reason<textarea rows="2" value={reason} onChange={e=>setReason(e.target.value)} placeholder="Explain evidence checked and why this update is necessary" /></label>
    <div className="button-row"><button className="primary" onClick={()=>adminChange(false)}>Save TFL review</button><button className="secondary" onClick={()=>adminChange(true)}>Archive / remove from active assessment</button></div>
    <small className="muted">Only TFL can change submitted declarations in this demonstration. Production must enforce this server-side.</small>
    </>}
   </div>}
 </section>;
}
