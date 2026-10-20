/** TijaPass V9: ONE explainable assessment for all views and loan lifecycle gates.
 * Financial evidence: accountingJournal; never use V4 sample turnover to approve finance.
 * All results are indicative, not credit bureau scores or lender approval.
 */
import { accountingReport } from './accounting.js';
export const POLICY_V9 = Object.freeze({
  scoreCutoff:70, minKyc:80, minCoverage:70, minReviewed:30, fullReviewed:300,
  minMonths:3, maxShare:[25,30,35], stressFactor:0.8,
  firstTenors:{Daily:90,Weekly:26,Monthly:12},
  repeatTenors:{Daily:90,Weekly:52,Monthly:36}
});
const num=x=>Math.max(0,Number(x)||0);
const cap=x=>Math.max(0,Math.min(100,x));
const monthKey=x=>String(x||'').slice(0,7);
export function kycV9(c){
  const fields=[c.owner,c.phone,c.dob,c.nida,c.businessName,c.sector,c.businessAddress,c.residentialAddress,c.profilePhoto,c.idDocument,c.consentAt];
  return Math.round(fields.filter(Boolean).length/fields.length*100);
}
export function cadenceToMonthly(amount,frequency='Monthly'){
  return num(amount)*(frequency==='Daily'?365/12:frequency==='Weekly'?52/12:1);
}
export function monthlyToCadence(amount,frequency='Monthly'){
  return num(amount)/(frequency==='Daily'?365/12:frequency==='Weekly'?52/12:1);
}
export function externalLoanSchedule(loan){
  const count=Math.max(0,Math.min(1200,Math.floor(num(loan.remainingInstallments))));
  const start=String(loan.nextDueDate||'');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!count)return [];
  const rows=[];
  for(let i=0;i<count;i++){
    const d=new Date(`${start}T12:00:00Z`);
    if(loan.frequency==='Weekly')d.setUTCDate(d.getUTCDate()+i*7);
    else if(loan.frequency==='Daily')d.setUTCDate(d.getUTCDate()+i);
    else {const day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+i);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));}
    rows.push({no:i+1,dueDate:d.toISOString().slice(0,10),amountDue:num(loan.installment),status:'Customer declared'});
  }
  return rows;
}
export function externalDebt(data,customerId,asOf=new Date().toISOString().slice(0,10)){
  const rows=(data.externalLoans||[]).filter(l=>l.customerId===customerId&&l.status!=='Archived');
  const active=rows.filter(l=>num(l.balance)>0);
  const monthly=active.reduce((s,l)=>s+cadenceToMonthly(l.installment,l.frequency),0);
  const arrears=active.reduce((s,l)=>s+externalLoanSchedule(l).filter(r=>r.dueDate<asOf).reduce((a,r)=>a+r.amountDue,0),0);
  return {loans:rows,active,monthly,arrears,balance:active.reduce((s,l)=>s+num(l.balance),0),unverified:active.filter(l=>l.status!=='TFL reviewed')};
}
export function trackedLoans(data,customerId){return (data.loans||[]).filter(l=>l.customerId===customerId);}
export function internalDebt(data,customerId,asOf=new Date().toISOString().slice(0,10)){
  const active=trackedLoans(data,customerId).filter(l=>['Active','Overdue'].includes(l.status));
  const outstanding=active.reduce((s,l)=>s+num(l.outstanding),0);
  const remaining=active.flatMap(l=>(l.schedule||[]).map(r=>({...r,loanId:l.id,frequency:l.repaymentFrequency||'Monthly'})).filter(r=>num(r.amountDue)-num(r.paid)>0));
  const overdue=remaining.filter(r=>r.dueDate<asOf).reduce((s,r)=>s+Math.max(0,num(r.amountDue)-num(r.paid)),0);
  const monthly=active.reduce((s,l)=>{
    const row=(l.schedule||[]).find(r=>num(r.amountDue)-num(r.paid)>0);
    return s+(row?cadenceToMonthly(Math.max(0,num(row.amountDue)-num(row.paid)),l.repaymentFrequency||'Monthly'):0);
  },0);
  return {active,outstanding,monthly,overdue,remaining};
}
function installmentHistory(data,customerId,asOf){
  const settled=trackedLoans(data,customerId).filter(l=>l.disbursedAt).flatMap(l=>l.schedule||[]);
  const past=settled.filter(r=>r.dueDate<=asOf);
  const punctual=past.filter(r=>r.status==='Paid'&&r.paidAt&&r.paidAt<=r.dueDate).length;
  const timelyRatio=past.length?punctual/past.length:0;
  const repaid=trackedLoans(data,customerId).filter(l=>l.status==='Repaid').length;
  return {pastCount:past.length,timelyRatio,repaid};
}
function entriesAndEvidence(data,customer){
  const stage=(data.accountingStaging||[]).filter(x=>x.customerId===customer.id);
  const journal=(data.accountingJournal||[]).filter(x=>x.customerId===customer.id&&!x.isReversal&&!x.reversalStatus&&!x.reversed);
  const reviewed=journal.filter(x=>x.approvedBy==='TFL accounting reviewer' || x.approvalMode==='TFL reviewed' || x.evidenceLevel==='TFL-reviewed source; not bank API-authenticated');
  const months=[...new Set(reviewed.map(e=>monthKey(e.date)).filter(Boolean))];
  const allUnique=new Set([...stage.filter(e=>e.status!=='Linked duplicate').map(e=>e.id),...journal.map(e=>e.id)]);
  const coverage=allUnique.size?Math.round(reviewed.length/allUnique.size*100):0;
  const report=accountingReport(customer,journal);
  const monthlyProfits=months.map(m=>{
    const rows=reviewed.filter(e=>monthKey(e.date)===m);
    const calc=accountingReport({...customer,openingWallet:0,openingCash:0,openingBank:0,openingMobile:0,inventoryValue:0,receivables:0,businessAssets:0,payables:0,openingLoan:0},rows);
    return calc.profit;
  });
  // Do not use unreviewed data, unreconciled opening figures or simulated V4 data as available earnings.
  const netProfit=months.length?Math.max(0,monthlyProfits.reduce((s,x)=>s+x,0)/months.length):0;
  const cashFlow=netProfit*0.8; // conservative cash conversion pending full receipts/payables/stock verification
  const reconciled=Object.values(data.accountingReconciliations?.[customer.id]||{}).some(v=>v!==''&&v!==null);
  return {reviewed:reviewed.length,months:months.length,coverage:Math.min(100,coverage),report,netProfit,cashFlow,reconciled,journalCount:journal.length};
}
export function creditAssessmentV9(data,customerId,asOf=new Date().toISOString().slice(0,10)){
  const c=data.customers.find(x=>x.id===customerId);
  if(!c)return {score:0,limit:0,eligibleData:false,band:'Not yet qualified',factors:[],reasons:['Customer not found']};
  const kyc=kycV9(c), evidence=entriesAndEvidence(data,c);
  const internal=internalDebt(data,customerId,asOf),external=externalDebt(data,customerId,asOf),history=installmentHistory(data,customerId,asOf);
  const repeat=trackedLoans(data,customerId).some(l=>Boolean(l.disbursedAt));
  const weights=repeat?{kyc:15,coverage:25,records:15,months:10,repayment:35}:{kyc:20,coverage:35,records:25,months:20,repayment:0};
  const kycPoints=cap(kyc);const coveragePoints=cap(evidence.coverage);
  const recordPoints=evidence.reviewed>=300?100:evidence.reviewed>=100?80:evidence.reviewed>=30?50:cap(evidence.reviewed/30*50);
  const monthsPoints=cap(evidence.months/12*100);
  const arrears=internal.overdue+external.arrears;
  const historyPoints= repeat? cap(history.timelyRatio*100)*0.2+ (arrears>0?0:100)*0.1+(external.monthly+internal.monthly>0&&evidence.cashFlow>0?cap(evidence.cashFlow/(external.monthly+internal.monthly)*25):0)*0.05:0;
  const score=Math.round((kycPoints*weights.kyc+coveragePoints*weights.coverage+recordPoints*weights.records+monthsPoints*weights.months)/100+historyPoints*(repeat?1:0));
  const reasons=[];
  if(kyc<80||c.status!=='Verified'||!c.consentAt)reasons.push('Complete and verify essential KYC and consent (≥80%).');
  if(evidence.coverage<70)reasons.push('At least 70% of transaction records must be TFL-reviewed.');
  if(evidence.reviewed<30)reasons.push('At least 30 unique, reviewed business transactions are needed.');
  if(evidence.months<3||num(c.operatingMonths)<3)reasons.push('At least 3 months of reviewed activity and operating history are required.');
  if(arrears>0)reasons.push('Overdue debt needs lender/TFL review before a new offer.');
  if(external.unverified.length)reasons.push('Customer-declared external loans require TFL verification.');
  if(evidence.cashFlow<=0)reasons.push('No supportable positive cash available for repayment from the reviewed accounting journal.');
  if(!evidence.report.journalBalanced||Math.abs(evidence.report.trialBalanceNet)>0.01||evidence.report.negativeCashAccounts.length)reasons.push('Accounting journal / cash balances need reconciliation.');
  if(score<70)reasons.push('Qualification score below 70/100.');
  const cleanPast=history.repaid;const progression=cleanPast>=2&&history.timelyRatio>=0.95&&arrears===0?2:cleanPast>=1&&history.pastCount>0&&history.timelyRatio>=0.9&&arrears===0?1:0;
  const share=[25,30,35][progression];
  const monthlyCapacity=Math.max(0,evidence.cashFlow*(share/100));
  const existingMonthlyDebt=internal.monthly+external.monthly;
  const availableMonthly=Math.max(0,monthlyCapacity-existingMonthlyDebt);
  if(availableMonthly<=0)reasons.push('Existing repayments exhaust monthly affordability allowance.');
  const eligibleData=reasons.length===0;
  return {
    score,limit:0,eligibleData,band:score>=85?'Strong':score>=70?'Qualified':score>=50?'Developing':'Not yet qualified',
    kyc,transactionScore:coveragePoints,repaymentScore:repeat?Math.round(historyPoints/0.35):null,
    factors:[['KYC completeness',kycPoints],['Reliable transaction coverage',coveragePoints],['Reviewed transactions',recordPoints],['Operating history',monthsPoints],...(repeat?[['Prior repayment performance',Math.round(historyPoints/0.35)]]:[])],
    weights,reviewedTransactions:evidence.reviewed,coverage:evidence.coverage,months:evidence.months,netProfit:evidence.netProfit,cashAvailable:evidence.cashFlow,
    repaymentShare:share,availableMonthly,monthlyCapacity,existingMonthlyDebt,totalOutstanding:internal.outstanding+external.balance,
    overdue:arrears,externalDebt:external,internalDebt:internal,history,progression,reasons,reviewedJournalOnly:true
  };
}
export function amortizationV9({principal,annualRate=0,fee=0,frequency='Monthly',count,firstDueDate}){
  const n=Math.floor(Number(count)||0);if(!(num(principal)>0&&n>0&&n<=1200))throw Error('Valid positive principal and term required.');
  if(!['Daily','Weekly','Monthly'].includes(frequency))throw Error('Invalid repayment frequency.');
  const rate=num(annualRate)/100/(frequency==='Daily'?365:frequency==='Weekly'?52:12);
  const payment=rate===0?num(principal)/n:num(principal)*rate/(1-(1+rate)**(-n));
  let remaining=num(principal);const result=[];
  for(let i=1;i<=n;i++){
    const accrued=remaining*rate,principalPart=i===n?remaining:Math.min(remaining,payment-accrued);
    const interest=Math.round(accrued),principalAmount=Math.round(principalPart);
    remaining=Math.max(0,remaining-principalPart);
    const d=new Date(`${firstDueDate}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+(frequency==='Daily'?i-1:frequency==='Weekly'?7*(i-1):0));
    if(frequency==='Monthly') {const original=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+i-1);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(original,last));}
    result.push({no:i,dueDate:d.toISOString().slice(0,10),principal:principalAmount,interest,fee:i===1?Math.round(fee):0,amountDue:principalAmount+interest+(i===1?Math.round(fee):0),paid:0,status:'Upcoming',openingBalance:Math.round(remaining+principalPart),closingBalance:Math.round(remaining)});
  }
  return result;
}
export function quoteV9({amount,annualRate=0,processingFeePct=0,fixedFee=0,frequency='Monthly',count,firstDueDate}){
  const fee=Math.round(num(amount)*num(processingFeePct)/100+num(fixedFee));
  const schedule=amortizationV9({principal:amount,annualRate,fee,frequency,count,firstDueDate});
  return {principal:num(amount),annualRate,processingFee:fee,totalInterest:schedule.reduce((s,r)=>s+r.interest,0),totalRepayment:schedule.reduce((s,r)=>s+r.amountDue,0),installment:schedule[0].amountDue,schedule};
}
export function offerPolicyV9(data,customerId,terms,asOf=new Date().toISOString().slice(0,10)){
  const a=creditAssessmentV9(data,customerId,asOf);
  const frequency=terms.frequency||'Monthly';
  const maxCount=(a.progression===0?POLICY_V9.firstTenors:POLICY_V9.repeatTenors)[frequency]||0;
  const count=Number(terms.count)||0;
  const reasons=[...a.reasons];
  if(!Number.isInteger(count)||count<1||count>maxCount)reasons.push(`Allowed ${frequency.toLowerCase()} tenure: 1–${maxCount} instalments at this progression tier.`);
  let quote=null,installmentCapacity=monthlyToCadence(a.availableMonthly,frequency);
  try {if(!reasons.some(r=>r.startsWith('Allowed ')))quote=quoteV9({amount:terms.amount,annualRate:terms.annualRate,processingFeePct:terms.processingFeePct,fixedFee:terms.fixedFee,frequency,count,firstDueDate:terms.firstDueDate});}
  catch(e){reasons.push(e.message)}
  if(quote?.schedule.some(r=>r.amountDue>installmentCapacity+1))reasons.push(`Instalment exceeds ${a.repaymentShare}% affordability after existing debt.`);
  if(num(terms.amount)<=0)reasons.push('Loan amount must be positive.');
  if(terms.maxAmount&&num(terms.amount)>num(terms.maxAmount))reasons.push('Amount exceeds financing product maximum.');
  if(terms.minAmount&&num(terms.amount)<num(terms.minAmount))reasons.push('Amount is below financing product minimum.');
  return {allowed:reasons.length===0,reasons,assessment:a,quote,perPeriodCapacity:installmentCapacity,maxCount};
}
export function maxAffordablePrincipalV9(data,customerId,terms,asOf){
  const a=creditAssessmentV9(data,customerId,asOf);if(!a.eligibleData)return 0;
  const maxCount=(a.progression===0?POLICY_V9.firstTenors:POLICY_V9.repeatTenors)[terms.frequency||'Monthly'];
  const count=Math.min(Number(terms.count)||0,maxCount);
  if(count<1)return 0;
  let low=0,high=num(terms.maxAmount||100000000),best=0;
  for(let i=0;i<34;i++){
    const mid=(low+high)/2;
    const q=quoteV9({amount:mid,annualRate:terms.annualRate||0,processingFeePct:terms.processingFeePct||0,fixedFee:terms.fixedFee||0,frequency:terms.frequency||'Monthly',count,firstDueDate:terms.firstDueDate||'2026-11-20'});
    if(q.schedule.every(r=>r.amountDue<=monthlyToCadence(a.availableMonthly,terms.frequency)+1)){best=mid;low=mid;}else high=mid;
  }
  return Math.max(0,Math.floor(best/1000)*1000);
}
