/** TijaPass V7: explainable risk controls for the browser demo. Not an external AI model.
 * Every decision must be repeated in an authenticated backend before real posting. */
import {smartClassify,CATEGORIES,entriesFor,checkJournal} from './accounting.js';
import {missingDetails,findPotentialMatches,anomalyFor,cleanText} from './accountingControls.js';
const income=new Set(['Sales','Service income','Other business income','Loan received','Owner capital','Wallet / bank transfer']);
const expense=new Set(['Inventory purchase','Cost of goods sold','Rent','Utilities','Salaries','Transport','Telecom','Taxes & licences','Marketing','Maintenance','Other expense','Wallet / bank transfer','Loan repayment','Owner withdrawal','Equipment purchase']);
const knownCategoryHints={
 'Sales': /(nimeuza|mauzo|sold|sales|goods sold|kuuza|received for|wateja|bidhaa)/i,
 'Service income':/(huduma|service|consulting|kazi|labor)/i,
 'Inventory purchase':/(stock|nimenunua|nunua|purchased|bought|bidhaa|wholesale)/i,
 'Rent':/(rent|pango|kodi ya nyumba|kodi ya fremu|landlord)/i,
 'Utilities':/(electric|umeme|tanesco|luku|maji|water|dawasa)/i,
 'Loan received':/(loan|mkopo|disbursement)/i,
 'Loan repayment':/(loan|mkopo|marejesho|repayment)/i,
 'Wallet / bank transfer':/(transfer|uhamisho|kuhamisha|akaunti yangu|own account)/i
};
export function directionCategories(direction){return CATEGORIES.filter(c=>(direction==='Income'?income:expense).has(c));}
export function inferTransaction(record,learning={}) {
 const suggestion=smartClassify(record.purpose||record.description||'',record.direction,learning);
 // Known utility counterparties are an additional cue, not an independent proof of purpose.
 if(record.direction==='Expense' && /\b(tanesco|dawasa)\b/i.test(record.counterparty||'') && suggestion.confidence<70){return {category:'Utilities',confidence:65,reason:'Counterparty suggests utilities — customer explanation required',allowed:directionCategories(record.direction)};}
 const allowed=directionCategories(record.direction);
 const compatible=allowed.includes(suggestion.category);
 return {category:compatible?suggestion.category:'',confidence:compatible?suggestion.confidence:0,reason:compatible?suggestion.reason:'Category does not agree with direction',allowed};
}
export function verifyCongruence(record,learning={}){
 const questions=[],flags=[];
 const purpose=cleanText(record.purpose),party=cleanText(record.counterparty),category=record.category||inferTransaction(record,learning).category;
 const amount=Number(record.amount||0);
 if(!party)questions.push('counterparty');
 if(!purpose || purpose.length<9)questions.push('purpose');
 if(!amount || amount<=0)questions.push('amount');
 if(!category || !directionCategories(record.direction).includes(category))flags.push('category-direction');
 const inferred=inferTransaction(record,learning);
 if(category && inferred.confidence>=85 && inferred.category && inferred.category!==category)flags.push('category-purpose');
 const words=purpose.toLowerCase();
 if(record.direction==='Income'&&/(nimenunua|nimelipa|paid|bought|purchased|gharama|rent payment)/i.test(words)&& !/(refund|rejesho|nimerejeshewa)/i.test(words))flags.push('purpose-direction');
 if(record.direction==='Expense'&&/(nimeuza|sold to|sales received|nimelipwa|received from)/i.test(words)&& !/(refund|returned goods)/i.test(words))flags.push('purpose-direction');
 // Catch an explicit different named counterparty only for unambiguous grammatical patterns.
 const m=purpose.match(/(?:from|kwa|to|kutoka kwa|kumlipa)\s+([A-Za-zÀ-ÿ]{3,})/i);
 if(m && party && !/^(walk-in|wateja|customers|wateja wa dukani)$/i.test(party)){
  const parsed=m[1].toLocaleLowerCase();const nameTokens=party.toLocaleLowerCase().split(/\s+/);
  const ignore=new Set(['kuuza','kulipa','bidhaa','huduma','malipo','kununua','kazi','mchele','mahindi','stock','goods','sales','service','the','bank','mauzo']);
  if(!ignore.has(parsed)&&!nameTokens.some(p=>p===parsed))flags.push('counterparty-purpose');
 }
 const hinted=knownCategoryHints[category];
 if(hinted && purpose.length>=9 && !hinted.test(purpose) && ['Loan received','Loan repayment','Rent','Utilities'].includes(category))flags.push('category-purpose');
 if(category==='Loan repayment'&&Number(record.interest||0)>amount)flags.push('interest-exceeds-payment');
 if(record.direction==='Expense' && /\b(tanesco|dawasa)\b/i.test(party) && ['Rent','Salaries','Inventory purchase'].includes(category))flags.push('counterparty-category');
 return {questions:[...new Set(questions)],flags:[...new Set(flags)],category};
}
export function superReview(record,allRecords=[],learning={}){
 const inference=inferTransaction(record,learning),r={...record,category:record.category||inference.category};
 const completeness=missingDetails(r),congruence=verifyCongruence(r,learning);
 const duplicates=findPotentialMatches(r,allRecords);
 const anomaly=anomalyFor(r,allRecords);
 let journalOK=false;
 try{journalOK=checkJournal([{lines:entriesFor(r)}]);}catch{}
 const needsClarification=!!(completeness.length||congruence.questions.length||congruence.flags.length||!journalOK);
 const sensitiveFinance=['Loan received','Loan repayment','Owner capital','Owner withdrawal','Equipment purchase','Wallet / bank transfer'].includes(r.category);
 const requiresHuman=Boolean(duplicates.length||anomaly||sensitiveFinance||r.entryMethod==='import'||r.reconciliationStatus==='Running balance mismatch – investigate');
 const score=Math.min(Number(r.confidence??inference.confidence??0),inference.confidence||0);
 // Browser demo can only automatically post clearly classified, customer-entered source entries;
 // these stay labelled SELF-DECLARED, never provider verified or lender ready.
 const autoClear=!needsClarification&&!requiresHuman&&score>=85&&r.entryMethod==='guided'&&r.customerConfirmed!==false;
 const outcome=needsClarification?'RETURN_TO_CUSTOMER':requiresHuman?'ESCALATE_TO_TFL':autoClear?'AUTO_CLEARED':'ESCALATE_TO_TFL';
 const reasons=[...completeness.map(x=>`Missing ${x}`),...congruence.flags,...congruence.questions.map(x=>`Clarify ${x}`),...(duplicates.length?['Potential duplicate — link evidence, do not post twice']:[]),...(anomaly?['Unusual amount — support and TFL approval required']:[]),...(!journalOK?['Journal cannot be balanced']:[]),...(score<85?[`Category confidence ${score}% requires review`]:[])];
 return {outcome,score,category:r.category,autoClear,requiresHuman,reasons,duplicates,anomaly,journalOK};
}
export function reverseJournal(entry,actor,reason,id,date){
 if(!reason||cleanText(reason).length<10)throw Error('A meaningful reversal reason is required.');
 if(!entry||!Array.isArray(entry.lines)||!entry.lines.length||entry.isReversal)throw Error('Choose an original posted journal.');
 const contra={...entry,id,reference:`REV-${entry.reference||entry.id}`,date,status:'Posted',isReversal:true,reversalOf:entry.id,approvedBy:actor,approvalMode:'Manual reversal',reversalReason:cleanText(reason),postedAt:new Date().toISOString(),lines:entry.lines.map(l=>({...l,debit:l.credit||0,credit:l.debit||0}))};
 if(!checkJournal([contra]))throw Error('Reversal did not balance.');
 return contra;
}
