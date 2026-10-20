/** TijaPass V6 validation and evidence controls. Browser pilot; production requires server-side enforcement. */
export const cleanText = (x) => String(x ?? '').trim().replace(/\s+/g,' ');
const low = x => cleanText(x).toLocaleLowerCase('en');
export const dayGap = (a,b) => {const x=Date.parse(a), y=Date.parse(b); return Number.isFinite(x)&&Number.isFinite(y)?Math.abs(x-y)/86400000:9999;};
export function missingDetails(record) {
 const issues=[];
 if(!(Number(record.amount)>0) || !Number.isFinite(Number(record.amount))) issues.push('amount');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(record.date||''))) issues.push('date');
 if(!['Income','Expense'].includes(record.direction)) issues.push('direction');
 if(!cleanText(record.counterparty)) issues.push('counterparty');
 const purpose=cleanText(record.purpose||record.description);
 if(!purpose || /^(transaction|payment|receipt|transfer|credit|debit|malipo|muamala|ingizo|income|expense|cash|received money|money received|paid money|nimepokea pesa|nimelipa pesa|pesa nimepokea)$/i.test(purpose))issues.push('purpose');
 if(record.category==='Wallet / bank transfer' && (!record.toAccount || record.toAccount===record.account))issues.push('destination');
 if(record.category==='Loan repayment' && (!Number.isFinite(Number(record.interest))||Number(record.interest)<0||Number(record.interest)>Number(record.amount)))issues.push('interest');
 return issues;
}
const normalRef = r => low(r.reference).replace(/[^a-z0-9]/g,'');
export function findPotentialMatches(record, others=[]) {
 return others.filter(x=>x.id!==record.id && x.customerId===record.customerId && !['Rejected','Matched evidence'].includes(x.status) && Number(x.amount)===Number(record.amount) && x.direction===record.direction).map(x=>{
  const refMatch=normalRef(record) && normalRef(record)===normalRef(x) && (record.sourceAccount||record.account)===(x.sourceAccount||x.account);
  const similarDate=dayGap(x.date,record.date)<=2;
  const counter=low(x.counterparty), target=low(record.counterparty);
  const closePurpose=low(x.purpose||x.description).slice(0,24)===low(record.purpose||record.description).slice(0,24);
  const crossSource=x.source!==record.source || x.entryMethod!==record.entryMethod;
  if(!refMatch && !(similarDate && (crossSource || (counter && target && counter===target) || closePurpose)))return null;
  return {id:x.id, record:x, reason:refMatch?'reference':'same amount/date/flow – inspect counterparties and underlying event', sameSource:!crossSource};
 }).filter(Boolean);
}
export function anomalyFor(record, confirmedRecords=[]) {
 const amount=Number(record.amount)||0;
 const history=confirmedRecords.filter(x=>x.customerId===record.customerId && x.status==='Posted' && x.id!==record.id && x.direction===record.direction).map(x=>Number(x.amount)||0).filter(x=>x>0);
 const max=history.length?Math.max(...history):0;
 if(max>0 && amount>=Math.max(max*10,1000000))return {code:'historic-spike',previousMax:max,ratio:Math.round(amount/max)};
 if(!history.length && amount>=10000000)return {code:'large-without-history',previousMax:0,ratio:0};
 return null;
}
export function reviewStatus(record, allRecords=[]) {
 const gaps=missingDetails(record);
 const matches=findPotentialMatches(record,allRecords);
 const anomaly=anomalyFor(record,allRecords);
 return {gaps,matches,anomaly,needsCustomerConfirmation:record.entryMethod==='import'&&!record.customerConfirmed};
}
export function normalizeProvider(provider) {return cleanText(provider).slice(0,80);}
export function evidenceQuality(records=[],posted=[]) {
 const pending=records.filter(r=>r.status==='Awaiting review').length;
 const linked=records.filter(r=>r.status==='Matched evidence').length;
 const imported=records.filter(r=>r.entryMethod==='import' && r.status==='Posted').length;
 const confirmed=records.filter(r=>r.customerConfirmed).length;
 return {pending,linked,imported,confirmed,posted:posted.length};
}
