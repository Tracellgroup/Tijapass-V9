import assert from 'node:assert/strict';
import {freshSeedData} from '../src/data.js';
import {creditAssessmentV9,offerPolicyV9,maxAffordablePrincipalV9,externalLoanSchedule,externalDebt,internalDebt,quoteV9} from '../src/creditV9.js';
import {validateExternalLoan} from '../src/externalLoanV9.js';
const test=(name,fn)=>{fn();console.log('PASS V9 '+name)};
const on='2026-10-20';
function healthyFixture(){
 const d=freshSeedData();d.loans=[];d.externalLoans=[];d.accountingStaging=[];d.accountingJournal=[];
 const c=d.customers[0];c.status='Verified';c.openingWallet=1000000;c.openingCash=100000;c.openingBank=0;c.openingMobile=0;c.inventoryValue=0;c.receivables=0;c.businessAssets=0;c.payables=0;c.openingLoan=0;
 let idx=0;
 for (const month of ['2026-07','2026-08','2026-09']) for(let j=0;j<40;j++){
  idx++;let amount=120000;
  d.accountingJournal.push({id:'J'+idx,customerId:c.id,date:`${month}-${String(j%27+1).padStart(2,'0')}`,approvedBy:'TFL accounting reviewer',source:'Mobile-money statement',status:'Posted',lines:[{account:'1030',debit:amount,credit:0},{account:'4000',debit:0,credit:amount}]});
 }
 return d;
}
test('No financing on V8 synthetic history without reviewed accounting',()=>{
 const d=freshSeedData();d.loans=[];let p=creditAssessmentV9(d,'CUST-1002',on);assert.equal(p.eligibleData,false);assert.equal(p.reviewedTransactions,0);assert.equal(p.availableMonthly,0);
});
test('100 point score: first-time borrower does not need prior repayment score',()=>{
 const d=healthyFixture(),a=creditAssessmentV9(d,'CUST-1001',on);
 assert.equal(a.reviewedTransactions,120);assert.equal(a.months,3);assert.equal(a.coverage,100);assert.equal(a.eligibleData,true,JSON.stringify(a.reasons));assert.ok(a.score>=70&&a.score<=100);assert.equal(a.repaymentShare,25);assert.equal(a.repaymentScore,null);
});
test('Customer existing loan fields and dates validate',()=>{
 const f={lender:'External Bank',balance:800000,installment:160000,frequency:'Monthly',remainingInstallments:6,nextDueDate:'2026-11-01'};
 assert.deepEqual(validateExternalLoan(f),[]);assert.equal(externalLoanSchedule(f).length,6);assert.equal(externalLoanSchedule(f)[1].dueDate,'2026-12-01');
 assert.ok(validateExternalLoan({...f,installment:10000}).length>0);
});
test('External debt reduces new amount without masquerading as wallet cash',()=>{
 const d=healthyFixture(),c=d.customers[0];const before=creditAssessmentV9(d,c.id,on);
 d.externalLoans.push({id:'EX1',customerId:c.id,lender:'External Bank',status:'TFL reviewed',balance:1000000,installment:500000,frequency:'Monthly',remainingInstallments:3,nextDueDate:'2026-11-10'});
 const after=creditAssessmentV9(d,c.id,on);assert.equal(after.existingMonthlyDebt,500000);assert.ok(after.availableMonthly<before.availableMonthly);assert.equal(after.totalOutstanding,1000000);
});
test('Unreviewed external debt still reduces affordability and blocks offer',()=>{
 const d=healthyFixture(),c=d.customers[0];d.externalLoans.push({id:'EX2',customerId:c.id,lender:'Other MFI',status:'Customer declared',balance:800000,installment:200000,frequency:'Monthly',remainingInstallments:6,nextDueDate:'2026-11-20'});
 const a=creditAssessmentV9(d,c.id,on);assert.equal(a.eligibleData,false);assert.ok(a.reasons.some(x=>x.includes('verification')));
});
test('Term caps daily 90 / weekly 26 first / monthly 12 first',()=>{
 const d=healthyFixture();for(const [freq,count] of [['Daily',91],['Weekly',27],['Monthly',13]]){
  const p=offerPolicyV9(d,'CUST-1001',{amount:100000,annualRate:18,frequency:freq,count,firstDueDate:'2026-11-01'},on);
  assert.equal(p.allowed,false);assert.ok(p.reasons.some(x=>x.includes('tenure')));
 }
});
test('Monthly loan installment and lender pricing gate automatically',()=>{
 const d=healthyFixture();const terms={amount:300000,annualRate:18,processingFeePct:2,frequency:'Monthly',count:6,firstDueDate:'2026-11-01',maxAmount:1000000};
 assert.equal(offerPolicyV9(d,'CUST-1001',terms,on).allowed,true,offerPolicyV9(d,'CUST-1001',terms,on).reasons.join(' | '));
 const limit=maxAffordablePrincipalV9(d,'CUST-1001',terms,on);assert.ok(limit>=300000);
 const rejected=offerPolicyV9(d,'CUST-1001',{...terms,amount:10000000},on);assert.equal(rejected.allowed,false);
});
test('Debt and arrears mean no silent offer',()=>{
 const d=healthyFixture();d.externalLoans.push({customerId:'CUST-1001',lender:'Bank',status:'TFL reviewed',balance:1200000,installment:250000,frequency:'Monthly',remainingInstallments:7,nextDueDate:'2026-09-01'});
 const a=creditAssessmentV9(d,'CUST-1001',on);assert.ok(a.overdue>0);assert.equal(a.eligibleData,false);
});
test('Existing TijaPass loans contribute to combined exposure',()=>{
 const d=healthyFixture();d.loans=[{id:'L',customerId:'CUST-1001',status:'Active',outstanding:500000,repaymentFrequency:'Weekly',schedule:[{no:1,dueDate:'2026-11-01',amountDue:40000,paid:0}]}];
 const a=creditAssessmentV9(d,'CUST-1001',on);assert.equal(a.totalOutstanding,500000);assert.ok(a.existingMonthlyDebt>160000);
});
test('No double-counted interest in quote and schedule',()=>{
 const q=quoteV9({amount:500000,annualRate:18,processingFeePct:2,frequency:'Weekly',count:12,firstDueDate:'2026-11-01'});
 assert.equal(q.schedule.length,12);assert.equal(q.processingFee,10000);assert.equal(q.totalRepayment,q.schedule.reduce((a,r)=>a+r.amountDue,0));
});
console.log('V9 credit / loan-registry tests complete');
