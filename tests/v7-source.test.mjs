import assert from 'node:assert/strict';
import fs from 'node:fs';
import {EN_SW,SW_EN} from '../src/v7FullLocale.js';
const read=p=>fs.readFileSync(p,'utf8');
const ui=read('src/AccountingStudio.jsx');
const app=read('src/App.jsx');
assert.ok(ui.includes("[['guided',ListChecks,'guided','guidedHint'],['import',FileSpreadsheet,'import','importHint']]"),'two entry methods');
assert.ok(!ui.includes("['text',MessageSquareText,'narrative'"),'no free-text independent method');
assert.ok(ui.includes('onClick={voice}')&&ui.includes("t('purpose')+' *'"),'voice nested after mandatory description');
assert.ok(ui.includes('superReview')&&ui.includes('returnToCustomer')&&ui.includes('reversePosted'),'TFL exception and audit tools present');
assert.ok(app.includes('attachPresentationTranslation')&&app.includes('data-lang={language}'),'locale switch present');
for(const [en,sw] of [['Overview','Muhtasari'],['Business wallet','Pochi ya Biashara'],['Financial Statements','Taarifa za Fedha'],['Income statement','Taarifa ya Mapato na Matumizi'],['Finance position','Hali ya Mkopo'],['What improves your limit?','Nini Kinaongeza Kiwango Chako cha Mkopo?']]){
 assert.equal(EN_SW.get(en),sw,`Swahili translation ${en}`);
 assert.equal(SW_EN.get(sw),en,`English reverse ${en}`);
}
assert.ok(fs.existsSync('src/assets/tijapass-logo-light-transparent.png'));
assert.ok(fs.existsSync('src/assets/tijapass-logo-dark-transparent.png'));
console.log('PASS V7 source workflows + i18n + branding');
