import React,{useState} from 'react';
import {internalDebt,externalDebt} from './creditV9.js';
const fmt=x=>'TZS '+new Intl.NumberFormat('en-TZ',{maximumFractionDigits:0}).format(Math.round(Number(x)||0));
const STEPS=['Submitted','Under review','Offered','Accepted','Ready to disburse','Active','Repaid'];
export default function LoanTrackerV9({data,customer,fiId=null}){
 const loans=(data.loans||[]).filter(l=>l.customerId===customer.id && (!fiId||l.fiId===fiId)).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
 const [open,setOpen]=useState('');const debt=internalDebt(data,customer.id),external=externalDebt(data,customer.id);
 const today=new Date().toISOString().slice(0,10);
 return <section className="v9-tracker"><div className="section-title"><h2>Loan journey & repayment tracker</h2><p>One reference from request through lender review, offer, supplier payment, instalments and closure. Existing external debts appear separately below.</p></div>
 <div className="v9-loan-stats"><div><span>Platform outstanding</span><strong>{fmt(debt.outstanding)}</strong></div><div><span>External debt declared</span><strong>{fmt(external.balance)}</strong></div><div><span>Instalments/month (all lenders)</span><strong>{fmt(debt.monthly+external.monthly)}</strong></div><div><span>Overdue (where recorded)</span><strong>{fmt(debt.overdue+external.arrears)}</strong></div></div>
 {loans.length?loans.map(l=>{
  const lender=data.financialInstitutions.find(f=>f.id===l.fiId);
  const due=(l.schedule||[]).map(r=>({...r,remaining:Math.max(0,(r.amountDue||0)-(r.paid||0))})).filter(r=>r.remaining>0).sort((a,b)=>a.dueDate.localeCompare(b.dueDate));
  const next=due[0]; const overdue=due.filter(r=>r.dueDate<today).reduce((s,r)=>s+r.remaining,0);
  const paid=(l.schedule||[]).reduce((s,r)=>s+(r.paid||0),0);
  const total=(l.schedule||[]).reduce((s,r)=>s+(r.amountDue||0),0);
  const past=l.status==='Repaid'?6:Math.max(0,STEPS.indexOf(l.status==='Overdue'?'Active':l.status));
  return <div className="panel" key={l.id}>
   <div className="v9-loan-head"><div><strong>{l.id}</strong><small>{lender?.name||'Financial institution'} · {l.purpose}</small></div><span className={'status '+(overdue?'red':l.status==='Repaid'?'green':'blue')}>{overdue?'Overdue':l.status}</span></div>
   <div className="v9-progress">{STEPS.map((step,i)=><div key={step} className={i<=past?'complete':''}><span>{i+1}</span><small>{step}</small></div>)}</div>
   <div className="v9-loan-stats"><div><span>Requested</span><strong>{fmt(l.requestedAmount)}</strong></div><div><span>Principal outstanding</span><strong>{fmt(l.outstanding)}</strong></div><div><span>Paid toward instalments</span><strong>{fmt(paid)}</strong></div><div><span>Next payment</span><strong>{next?`${fmt(next.remaining)} · ${next.dueDate}`:'—'}</strong></div></div>
   <div className="v9-loan-actions"><span>{l.repaymentFrequency||'Monthly'} repayments · {l.annualRate||'Offer pending'}% p.a. · {l.schedule?.length||0} instalments</span><button className="mini-action" onClick={()=>setOpen(open===l.id?'':l.id)}>{open===l.id?'Hide schedule':'View full schedule'}</button></div>
   {open===l.id&&<div className="table-wrap"><table><thead><tr><th>#</th><th>Due</th><th>Principal</th><th>Interest</th><th>Fees</th><th>Paid</th><th>Remaining</th></tr></thead><tbody>{(l.schedule||[]).map(r=><tr key={r.no}><td>{r.no}</td><td>{r.dueDate}</td><td>{fmt(r.principal)}</td><td>{fmt(r.interest)}</td><td>{fmt(r.fee)}</td><td>{fmt(r.paid)}</td><td>{fmt(Math.max(0,(r.amountDue||0)-(r.paid||0)))}</td></tr>)}</tbody></table></div>}
  </div>;
 }):<div className="panel">No TijaPass finance applications recorded for this business.</div>}
 </section>;
}
