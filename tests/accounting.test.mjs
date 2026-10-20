import assert from 'node:assert/strict';
import fs from 'node:fs';
let ts; try { ts=(await import('typescript')).default; } catch { try { ts=(await import('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')).default; } catch { ts=null; } }
import {smartClassify,entriesFor,accountingReport,accountingCreditSignal,checkJournal,parseDelimited,statementRows,numberFromText,normalizedDate,checkStatementRunningBalances,fingerprint} from '../src/accounting.js';
import {readStatementFile} from '../src/importers.js';
let pass=0;
function test(name,fn){try{fn();console.log('PASS',name);pass++;}catch(e){console.error('FAIL',name,e.message);process.exitCode=1;}}
const c={id:'TEST-1',openingWallet:1000000,openingCash:200000,openingBank:500000,openingMobile:100000,inventoryValue:650000,receivables:200000,businessAssets:1500000,payables:80000,openingLoan:500000,status:'Verified',nida:'2000',phone:'255',consentAt:'2026-01-01'};
function entry(id,description,direction,category,amount,account,toAccount=null,interest=0,date='2026-10-02'){
 const record={id,customerId:c.id,description,direction,category,amount,account,toAccount,interest,date,source:account==='1030'?'Mobile-money statement':'Bank statement'};
 return {...record,lines:entriesFor(record)};
}
const j=[entry('S','sale','Income','Sales',200000,'1030'),entry('I','stock','Expense','Inventory purchase',300000,'1020'),entry('R','rent','Expense','Rent',80000,'1020'),entry('C','sold stock','Expense','Cost of goods sold',120000,'1020'),entry('T','own transfer','Expense','Wallet / bank transfer',50000,'1030','1020'),entry('L','loan repay','Expense','Loan repayment',110000,'1020',null,10000),entry('OC','owner money','Income','Owner capital',100000,'1010'),entry('F','equipment','Expense','Equipment purchase',60000,'1020')];
const report=accountingReport(c,j);
test('Classify Kiswahili sales',()=>assert.equal(smartClassify('Nimeuza bidhaa TZS 200,000','Income').category,'Sales'));
test('Classify Kiswahili rent',()=>assert.equal(smartClassify('Nimelipa kodi ya fremu','Expense').category,'Rent'));
test('Classify loan and stock correctly',()=>{assert.equal(smartClassify('Nimenunua stock','Expense').category,'Inventory purchase');assert.equal(smartClassify('Lipa mkopo','Expense').category,'Loan repayment')});
test('Number formats and date',()=>{assert.equal(numberFromText('TZS 1,250,000'),1250000);assert.equal(normalizedDate('08/10/2026'),'2026-10-08')});
test('Every journal double-entry balances',()=>assert.ok(checkJournal(j)));
test('Sales 200k and COGS 120k independent of stock purchases',()=>{assert.equal(report.revenue,200000);assert.equal(report.cogs,120000);assert.equal(report.balances['1100'],650000+300000-120000)});
test('Principal 100k and interest 10k correctly separated',()=>{assert.equal(report.balances['2100'],-400000);assert.equal(report.interest,10000);assert.equal(report.cashFlows.financing,0);const onlyLoan=accountingReport(c,[j.find(e=>e.id==='L')]);assert.equal(onlyLoan.cashFlows.financing,-100000);assert.equal(onlyLoan.cashFlows.operating,-10000)});
test('Cash transfers excluded from income and outflow',()=>{assert.equal(report.revenue,200000);assert.equal(report.cashFlows.transfers,0)});
test('Cash-flow operating and investing classifications',()=>{assert.equal(report.cashFlows.operating,200000-300000-80000-10000);assert.equal(report.cashFlows.investing,-60000)});
test('Balance sheet and trial balance reconcile',()=>{assert.equal(report.check,0);assert.equal(report.trialBalanceNet,0);assert.equal(report.assets,report.liabilities+report.closingEquity)});
test('CSV quoted fields parse',()=>assert.deepEqual(parseDelimited('Date,Description,Debit,Credit\n2026-10-01,"Sale, Mbezi",,120000')[1],['2026-10-01','Sale, Mbezi','','120000']));
test('Statement import rows',()=>{const rows=statementRows(parseDelimited('Date,Description,Debit,Credit,Reference\n2026-10-01,Sale,,120000,MP-1\n2026-10-02,Rent,80000,,MP-2'),'Mobile-money statement');assert.equal(rows.length,2);assert.equal(rows[1].direction,'Expense');assert.equal(rows[1].amount,80000)});
test('Running balance inconsistency is flagged',()=>{const rows=statementRows(parseDelimited('Date,Description,Debit,Credit,Balance\n2026-10-01,Sale,,120000,120000\n2026-10-02,Rent,80000,,50000'),'Bank statement');assert.equal(checkStatementRunningBalances(rows)[1].reconciliationStatus,'Running balance mismatch – investigate')});
test('Duplicate fingerprint stable',()=>{const tx={date:'2026-10-01',amount:1000,description:'Sale',source:'Bank statement',direction:'Income',reference:'001'};assert.equal(fingerprint('TEST',tx),fingerprint('TEST',{...tx,description:'Other narrative'}))});
test('Data-backed credit withheld without 3-month history',()=>{const readiness=accountingCreditSignal(c,j);assert.equal(readiness.eligible,false);assert.equal(readiness.indicativeLimit,0)});
test('JSX/JS source parses when TypeScript parser is available',()=>{if(!ts){console.log('  SKIP: TypeScript parser not installed in local environment');return;}for (const f of ['src/App.jsx','src/AccountingStudio.jsx','src/domain.js','src/accounting.js','src/importers.js','src/data.js']){const src=fs.readFileSync(f,'utf8');const ast=ts.createSourceFile(f,src,ts.ScriptTarget.ES2022,true,f.endsWith('.jsx')?ts.ScriptKind.JSX:ts.ScriptKind.JS);assert.equal(ast.parseDiagnostics.length,0,f+': '+ast.parseDiagnostics.map(e=>e.messageText).join(','));}});
console.log(`${pass} accounting and source parsing checks passed`);
