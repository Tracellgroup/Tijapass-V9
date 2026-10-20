// V8 business UX rules. Intentionally no payment processing or external AI claims.
export const V8_PLANS = Object.freeze([
 {id:'basic',price:0,period:'month',title:{en:'Basic',sw:'Bure'},description:{en:'Build your records without paying per transaction.',sw:'Hifadhi kumbukumbu za biashara bila kulipia kila muamala.'},features:{en:['Unlimited basic transaction recording','Daily business overview','Credit passport and standard support'],sw:['Rekodi miamala ya kawaida bila kikomo','Muhtasari wa biashara kila siku','Wasifu wa mkopo na msaada wa kawaida']}},
 {id:'weekly',price:1000,period:'week',title:{en:'Weekly Flex',sw:'Wiki'},description:{en:'Short-term access to enhanced reports and insights.',sw:'Taarifa na uchambuzi zaidi kwa muda wa wiki.'},features:{en:['Everything in Basic','Enhanced business reports','Guided insights and priority queries'],sw:['Huduma zote za Bure','Taarifa za biashara za kina zaidi','Ushauri na msaada wa kipaumbele']}},
 {id:'plus',price:3000,period:'month',title:{en:'TijaPass Plus',sw:'TijaPass Plus'},description:{en:'A practical monthly plan for growing traders.',sw:'Mpango wa mwezi kwa biashara inayokua.'},features:{en:['Everything in Basic','Enhanced reporting and insights','Extended history and priority support'],sw:['Huduma zote za Bure','Ripoti na ushauri wa kina','Historia zaidi na msaada wa kipaumbele']}},
 {id:'pro',price:8000,period:'month',title:{en:'Business Pro',sw:'Business Pro'},description:{en:'For businesses that need more detailed control.',sw:'Kwa biashara zinazohitaji usimamizi wa kina.'},features:{en:['Everything in Plus','Inventory and cash-flow analysis','Multi-user access (planned)'],sw:['Huduma zote za Plus','Uchambuzi wa bidhaa na mtiririko wa fedha','Watumiaji wengi (inapangwa)']}},
 {id:'day',price:500,period:'day',title:{en:'One-day pass',sw:'Huduma ya Siku'},description:{en:'Optional one-day access to a premium report.',sw:'Taarifa ya ziada kwa siku moja bila kujifunga.'},features:{en:['One-day premium report preview','No recurring daily deduction'],sw:['Taarifa ya ziada ya siku moja','Hakuna makato ya kila siku']}}
]);
export function feeText(p,lang='en') {
 if(!p.price)return lang==='sw'?'Bure':'Free';
 const period={week:{sw:'wiki',en:'week'},month:{sw:'mwezi',en:'month'},day:{sw:'siku',en:'day'}}[p.period];
 return `TZS ${p.price.toLocaleString('en-TZ')} / ${period[lang]}`;
}
export const SUPPORT_TOPICS = [
 {id:'accounting',label:{en:'Record sales and expenses',sw:'Kurekodi mauzo na matumizi'},tokens:/record|sale|expense|cash|receipt|account|profit|mauzo|matumizi|faida|rekodi|muamala|luku|stock/i,answer:{en:'Open Smart Accounting. Choose Money received or Money paid, enter who paid, amount, and why. Review and confirm before submitting. If the category is unclear, TijaPass requests clarification.',sw:'Fungua Uhasibu Rahisi. Chagua Pesa nilizopokea au nilizolipa, jaza mhusika, kiasi na sababu. Kagua kabla ya kuwasilisha. Mfumo utaomba maelezo zaidi ikihitajika.'}},
 {id:'wallet',label:{en:'Wallet and transactions',sw:'Pochi na miamala'},tokens:/wallet|balance|transfer|withdraw|deposit|pochi|salio|hamisha|toa pesa|weka pesa/i,answer:{en:'Open Wallet to review the demonstration balance and transfers. Actual deposits or withdrawals require a licensed payment partner; balances shown here are not real money.',sw:'Fungua Pochi kuona salio na miamala ya majaribio. Kuweka au kutoa pesa halisi kunahitaji mshirika wa malipo mwenye leseni.'}},
 {id:'finance',label:{en:'Finance and repayment',sw:'Mikopo na marejesho'},tokens:/loan|credit|finance|limit|repay|mkopo|mikopo|marejesho|kikomo|riba/i,answer:{en:'Open Finance to view indicative eligibility and financing terms. The lender decides rates and approvals. This demonstration cannot issue a real loan.',sw:'Fungua Mikopo kuona makadirio ya uwezo wa kukopa na masharti. Mkopeshaji ndiye huamua riba na idhini. Hili ni jaribio, si mkopo halisi.'}},
 {id:'profile',label:{en:'Profile and documents',sw:'Wasifu na nyaraka'},tokens:/profile|register|nida|identity|document|signup|wasifu|sajili|kitambulisho|nyaraka/i,answer:{en:'Open My Profile to check your business and identification details. TFL must verify evidence before treating the profile as verified.',sw:'Fungua Wasifu Wangu kukagua taarifa zako na za biashara. TFL lazima ithibitishe ushahidi kabla ya kuutambua wasifu kama uliothibitishwa.'}},
 {id:'pricing',label:{en:'Packages and prices',sw:'Vifurushi na bei'},tokens:/plan|price|subscription|package|cost|pay|bei|ada|kifurushi|malipo|lipia/i,answer:{en:'Basic record keeping is free. Optional plans are TZS 1,000/week, TZS 3,000/month and Business Pro from TZS 8,000/month (proposed prices). No real subscription payments are processed in this demo.',sw:'Kurekodi miamala ya kawaida ni bure. Bei zinazopendekezwa ni TZS 1,000/wiki, TZS 3,000/mwezi na Business Pro kuanzia TZS 8,000/mwezi. Hakuna malipo halisi katika jaribio hili.'}}
];
export function suggestedSupportAnswer(message,lang='en'){
 const clean=String(message||'').trim().slice(0,500);
 if(!clean)return null;
 // Financial disputes, data access and suspected wrongdoing always go to a person.
 if(/fraud|scam|stolen|wrong charge|unauthori[sz]ed|hack|lost money|malalamiko|wizi|utapeli|pesa zimepotea|siyo yangu|sikuidhinisha/i.test(clean)){
  return {topic:'urgent',escalate:true,text:lang==='sw'?'Hili linahitaji msaada wa mfanyakazi wa TFL. Fungua tiketi ya msaada bila kutuma NIDA, PIN au nenosiri hapa.':'This needs a TFL officer. Open a support ticket without sharing NIDA, PINs or passwords here.'};
 }
 const match=SUPPORT_TOPICS.find(t=>t.tokens.test(clean));
 if(match)return {topic:match.id,escalate:false,text:match.answer[lang]};
 return {topic:'general',escalate:true,text:lang==='sw'?'Sijahakikisha jibu la swali hili. Tafadhali fungua tiketi ya msaada ili TFL ijibu.':'I cannot reliably answer that. Please open a support ticket for a TFL officer.'};
}
export function whatsappHref(raw){
 const digits=String(raw||'').replace(/\D/g,'');
 return /^255\d{9}$/.test(digits)?`https://wa.me/${digits}`:null;
}
export function phoneHref(raw){const safe=String(raw||'').replace(/[^+0-9]/g,'');return safe.length>=10?`tel:${safe}`:null;}
export function visibleTickets(tickets,role,entityId){return (tickets||[]).filter(t=>role==='TFL Admin'||(t.role===role&&t.entityId===entityId));}
