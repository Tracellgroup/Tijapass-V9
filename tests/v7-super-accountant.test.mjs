import assert from 'node:assert/strict';
import {verifyCongruence,inferTransaction,superReview,directionCategories,reverseJournal} from '../src/superAccountant.js';
const sale={id:'A',customerId:'C',date:'2026-10-10',amount:20000,direction:'Income',counterparty:'Juma',purpose:'Nimeuza mchele kwa Juma',description:'Nimeuza mchele kwa Juma',category:'Sales',account:'1010',source:'Manual cash',entryMethod:'guided',customerConfirmed:true,status:'Awaiting review'};
const tests=[
 ['customer sale cleared but self-declared',()=>assert.equal(superReview(sale,[]).outcome,'AUTO_CLEARED')],
 ['missing reason returned',()=>assert.equal(superReview({...sale,purpose:''},[]).outcome,'RETURN_TO_CUSTOMER')],
 ['contradictory direction rejected',()=>assert.equal(superReview({...sale,direction:'Expense'},[]).outcome,'RETURN_TO_CUSTOMER')],
 ['wrong semantic category blocked',()=>assert.equal(superReview({...sale,category:'Owner capital'},[]).outcome,'RETURN_TO_CUSTOMER')],
 ['loan receipt needs accounting review',()=>assert.equal(superReview({...sale,category:'Loan received',purpose:'Loan received from Juma'},[]).outcome,'ESCALATE_TO_TFL')],
 ['counterparty mismatch prompts',()=>assert.ok(verifyCongruence({...sale,counterparty:'Asha'}).flags.includes('counterparty-purpose'))],
 ['bank import requires TFL',()=>assert.equal(superReview({...sale,entryMethod:'import'},[]).outcome,'ESCALATE_TO_TFL')],
 ['duplicate requires TFL',()=>assert.equal(superReview({...sale,id:'B',source:'Mobile-money statement',entryMethod:'import'},[sale]).outcome,'ESCALATE_TO_TFL')],
 ['very large amount requires TFL',()=>assert.equal(superReview({...sale,amount:20000000},[{...sale,status:'Posted'}]).outcome,'ESCALATE_TO_TFL')],
 ['income excludes rent',()=>assert.ok(!directionCategories('Income').includes('Rent'))],
 ['rent recognised as expense',()=>assert.equal(inferTransaction({...sale,direction:'Expense',purpose:'Paid shop rent for October'}).category,'Rent')],
 ['reversal swaps debits credits',()=>{let original={...sale,status:'Posted',lines:[{account:'1010',debit:20000,credit:0},{account:'4000',debit:0,credit:20000}]};let rv=reverseJournal(original,'Accountant','Duplicate transaction','REV1','2026-10-14');assert.equal(rv.lines[0].credit,20000);assert.equal(rv.lines[1].debit,20000);}]
];
for (const [name,fn] of tests){try{fn();console.log('PASS',name)}catch(e){console.error('FAIL',name,e);process.exitCode=1}};
console.log('V7 accountant:',tests.length,'checks');
