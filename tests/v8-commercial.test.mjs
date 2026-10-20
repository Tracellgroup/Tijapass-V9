import assert from 'node:assert/strict';
import fs from 'node:fs';
import {V8_PLANS,feeText,suggestedSupportAnswer,visibleTickets,whatsappHref,phoneHref} from '../src/v8Commercial.js';
const check=(name,fn)=>{fn(); console.log('PASS',name)};
check('Basic is free and transaction recording not per-entry',()=>{assert.equal(V8_PLANS.find(p=>p.id==='basic').price,0);assert.ok(V8_PLANS.find(p=>p.id==='basic').features.en[0].includes('Unlimited'))});
check('Weekly and monthly rates align to proposed market tests',()=>{assert.equal(V8_PLANS.find(p=>p.id==='weekly').price,1000);assert.equal(V8_PLANS.find(p=>p.id==='plus').price,3000);assert.equal(V8_PLANS.find(p=>p.id==='pro').price,8000);assert.equal(feeText(V8_PLANS.find(p=>p.id==='weekly'),'sw'),'TZS 1,000 / wiki')});
check('No actual subscription recurring deduction',()=>{const src=fs.readFileSync('src/ExperienceV8.jsx','utf8');assert.ok(src.includes('No payment taken'));assert.ok(!src.includes('chargeCard('));assert.ok(src.includes('Requested'))});
check('Bilingual accounting FAQ',()=>{assert.match(suggestedSupportAnswer('Narekodi vipi mauzo ya cash?','sw').text,/Fungua Uhasibu/);assert.match(suggestedSupportAnswer('How do I record sales?','en').text,/Smart Accounting/)});
check('Financial complaint must escalate',()=>{assert.equal(suggestedSupportAnswer('money stolen from wallet','en').escalate,true);assert.equal(suggestedSupportAnswer('pesa zimepotea','sw').escalate,true)});
check('Unrecognised request not hallucinated',()=>{assert.equal(suggestedSupportAnswer('Can you fix all my old bank history?').escalate,true)});
check('Support ticket access scope',()=>{const tickets=[{role:'Customer',entityId:'CUST1'},{role:'Customer',entityId:'CUST2'},{role:'Supplier',entityId:'SUP'}];assert.equal(visibleTickets(tickets,'Customer','CUST1').length,1);assert.equal(visibleTickets(tickets,'TFL Admin','FI-TFL').length,3);assert.equal(visibleTickets(tickets,'Supplier','SUP').length,1)});
check('Whatsapp only official valid Tanzania number',()=>{assert.equal(whatsappHref(''),null);assert.equal(whatsappHref('https://evil.com'),null);assert.equal(whatsappHref('+255 754 123 456'),'https://wa.me/255754123456');assert.equal(phoneHref('invalid'),null)});
const ts=(await import('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')).default;
for(const p of ['src/App.jsx','src/ExperienceV8.jsx','src/AccountingStudio.jsx']){
 const ast=ts.createSourceFile(p,fs.readFileSync(p,'utf8'),ts.ScriptTarget.ES2022,true,ts.ScriptKind.JSX);
 check('JSX syntax '+p,()=>assert.equal(ast.parseDiagnostics.length,0,ast.parseDiagnostics.map(d=>d.messageText).join(' | ')));
}
check('Navigation and new screens wired',()=>{const s=fs.readFileSync('src/App.jsx','utf8');assert.ok(s.includes('screen === "help"'));assert.ok(s.includes('screen === "plans"'));assert.ok(s.includes('CustomerHomeV8'));assert.ok(s.includes('initialDirection={entryFocus}'));});
console.log('V8 commercial / help / integration checks passed');
