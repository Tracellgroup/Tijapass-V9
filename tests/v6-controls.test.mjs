import assert from 'node:assert/strict';
import {missingDetails,findPotentialMatches,anomalyFor,reviewStatus,dayGap} from '../src/accountingControls.js';
import {entriesFor,checkJournal,accountingReport} from '../src/accounting.js';
const base={id:'X',customerId:'C',date:'2026-10-10',amount:100000,direction:'Income',counterparty:'Juma',purpose:'Sold rice',description:'Sold rice',category:'Sales',account:'1030',source:'Manual cash',entryMethod:'guided',status:'Awaiting review'};
const tests = [
 ['Complete record',()=>assert.deepEqual(missingDetails(base),[])],
 ['Missing payer and purpose blocked',()=>assert.deepEqual(missingDetails({...base,counterparty:'',purpose:'',description:'payment'}).sort(),['counterparty','purpose'])],
 ['Reference duplicate identified',()=>assert.equal(findPotentialMatches({...base,id:'B',reference:'AB-42'},[{...base,reference:'AB-42',id:'A'}]).length,1)],
 ['Cross-method duplicate detected',()=>assert.equal(findPotentialMatches({...base,id:'B',source:'Mobile-money statement',entryMethod:'import'},[base]).length,1)],
 ['Different amount not duplicate',()=>assert.equal(findPotentialMatches({...base,id:'B',amount:200000},[base]).length,0)],
 ['Different date not matched',()=>assert.equal(findPotentialMatches({...base,id:'B',date:'2026-09-01'},[base]).length,0)],
 ['Large receipt flagged',()=>assert.equal(anomalyFor({...base,amount:20000000},[{...base,id:'Y',amount:20000,status:'Posted'}]).code,'historic-spike')],
 ['Ordinary receipt not flagged',()=>assert.equal(anomalyFor(base,[{...base,id:'Y',amount:50000,status:'Posted'}]),null)],
 ['Every import requires explicit customer confirmation',()=>assert.equal(reviewStatus({...base,entryMethod:'import',customerConfirmed:false}).needsCustomerConfirmation,true)],
 ['Cash transfer produces no sales',()=>{let x={...base,category:'Wallet / bank transfer',direction:'Expense',toAccount:'1020',account:'1030'};let lines=entriesFor(x);assert.ok(checkJournal([{lines}]));assert.equal(lines.some(y=>y.account==='4000'),false);}],
 ['Owner capital does not become sales',()=>{let x={...base,category:'Owner capital'};let lines=entriesFor(x);assert.equal(lines[1].account,'3100');}],
 ['Accounting sale balanced',()=>{const lines=entriesFor(base);assert.ok(checkJournal([{lines}]));}],
 ['Time gap correct',()=>assert.equal(dayGap('2026-10-10','2026-10-11'),1)]
];
for(const [name,fn] of tests){try{fn();console.log('PASS',name);}catch(e){console.error('FAIL',name,e);process.exitCode=1;}}
console.log('V6 controls:',tests.length,'checks');
