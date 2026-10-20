import React, {useEffect,useMemo,useRef,useState} from 'react';
import {BookOpen,BrainCircuit,FileSpreadsheet,Upload,Camera,Mic,MicOff,CheckCheck,ShieldCheck,AlertTriangle,Download,FileText,Plus,RotateCcw,ArrowRightLeft,Check,SearchCheck,Landmark,MessageSquareText,ListChecks,ClipboardList} from 'lucide-react';
import {ACCOUNTS,CATEGORIES,SOURCE_ACCOUNTS,accountingReport,entriesFor,fingerprint,smartClassify,statementRows,statementCsvTemplate,numberFromText,moneyAmount,normalizedDate,checkJournal,checkStatementRunningBalances,accountingCreditSignal} from './accounting.js';
import {readStatementFile} from './importers.js';
import {missingDetails,findPotentialMatches,anomalyFor,reviewStatus,normalizeProvider,evidenceQuality} from './accountingControls.js';
import {tr,categoryLabel} from './v6i18n.js';
import {inferTransaction,directionCategories,verifyCongruence,superReview,reverseJournal} from './superAccountant.js';
import {money,todayISO,uid} from './domain.js';
const num=x=>new Intl.NumberFormat('en-TZ',{maximumFractionDigits:0}).format(Math.round(x||0));
const cashAccounts=Object.entries(ACCOUNTS).filter(([,v])=>v[2]==='cash');
const accountLabel=k=>`${k} · ${ACCOUNTS[k]?.[0]||k}`;
function Field({label,children}){return <label className="studio-field"><span>{label}</span>{children}</label>}
function SRow({label,value,strong=false,neutral=false}){return <div className={'data-row'+(strong?' strong':'')}><span>{label}</span><b>{neutral?value:money(value)}</b></div>}
function pickAmount(text){const a=String(text).match(/(?:TZS|TSh|shs|sh|kiasi)\s*([\d,.]+)/i);if(a)return Math.abs(numberFromText(a[1]));const b=String(text).match(/\b\d{2,}(?:[,.]\d{3})*\b/g);return b?.length?Math.abs(numberFromText(b[b.length-1])):0}
const EMPTY={counterparty:'',purpose:'',description:'',amount:'',direction:'Income',date:todayISO(),channel:'Cash',reference:'',category:'',toAccount:'1020',interest:0,receiptName:'',evidenceNote:''};
const getAccount=channel=>({Cash:'1010','Mobile money':'1030',Bank:'1020','TijaPass wallet':'1000'})[channel]||'1010';
const getSource=channel=>({Cash:'Manual cash','Mobile money':'Self-reported mobile money',Bank:'Self-reported bank','TijaPass wallet':'TijaPass wallet'})[channel]||'Manual cash';
const roleCanEdit=role=>['Customer','TFL Admin'].includes(role);
const csvSafe=x=>{const text=String(x??'');return `"${(/^[=+@\-\t\r]/.test(text)?"'":"")+text.replace(/"/g,'""')}"`};
export default function AccountingStudio({data,customer,role,fi,mutate,notify,audit,setCustomerId,language='en',initialTab='workbench',initialDirection='Income'}){
 const t=k=>tr(language,k);
 const fileRef=useRef(null),photoRef=useRef(null),recognitionRef=useRef(null);
 const [tab,setTab]=useState(initialTab),[entryMethod,setEntryMethod]=useState('guided');
 const [form,setForm]=useState({...EMPTY,direction:initialDirection}),[notice,setNotice]=useState(''),[listening,setListening]=useState(false),[busy,setBusy]=useState(false);
 const [providerType,setProviderType]=useState('Mobile-money statement'),[providerName,setProviderName]=useState(''),[sourceAlias,setSourceAlias]=useState('');
 const [edit,setEdit]=useState({}),[opening,setOpening]=useState({}),[comparison,setComparison]=useState({});
 const [photoPreview,setPhotoPreview]=useState('');
 const [reversalReason,setReversalReason]=useState({}),[returnNotes,setReturnNotes]=useState({}),[confirmVoice,setConfirmVoice]=useState(false);
 const [showMoreTypes,setShowMoreTypes]=useState(false);
 useEffect(()=>{setOpening({openingDate:customer.openingDate||'2026-10-01',openingWallet:customer.openingWallet||0,openingCash:customer.openingCash||0,openingBank:customer.openingBank||0,openingMobile:customer.openingMobile||0,inventoryValue:customer.inventoryValue||0,receivables:customer.receivables||0,businessAssets:customer.businessAssets||0,payables:customer.payables||0,openingLoan:customer.openingLoan||0});setEdit({});},[customer.id]);
 const stage=(data.accountingStaging||[]).filter(x=>x.customerId===customer.id), posted=(data.accountingJournal||[]).filter(x=>x.customerId===customer.id && !x.reversed);
 const pending=stage.filter(x=>['Awaiting review','Returned for correction'].includes(x.status));
 const aiCounts={auto:posted.filter(x=>x.approvalMode==='V7 rules auto-cleared').length,escalated:pending.filter(x=>x.aiOutcome==='ESCALATE_TO_TFL').length,returned:pending.filter(x=>x.status==='Returned for correction').length};
 const combined=[...stage,...posted];
 const learning=data.accountingLearning?.[customer.id]||{};
 const proposed=inferTransaction(form,learning);
 const candidateCategory=form.category||proposed.category;
 const clientCheck=superReview({...form,category:candidateCategory,entryMethod:'guided',customerId:customer.id,source:getSource(form.channel),account:getAccount(form.channel),customerConfirmed:true,amount:form.amount},combined,learning);
 const report=useMemo(()=>accountingReport({...customer,openingWallet:customer.openingWallet??data.wallets.find(w=>w.id===customer.walletId)?.balance??0},posted),[customer,posted,data.wallets]);
 const verifiedForCredit=posted.filter(j=>!j.isReversal&&!j.reversalStatus&&j.approvalMode!=='V7 rules auto-cleared');
 const signal=accountingCreditSignal(customer,verifiedForCredit,data.accountingReconciliations?.[customer.id]||{});
 const quality=evidenceQuality(stage,posted);
 const reviewer=role==='TFL Admin',editable=roleCanEdit(role);
 const statusText=(issues)=>issues.map(x=>({amount:t('amount'),date:t('date'),direction:t('moneyIn')+'/'+t('moneyOut'),counterparty:t('counterparty'),purpose:t('purpose'),destination:t('destination'),interest:t('interest')})[x]||x).join(', ');
 const setValue=(k,v)=>setForm(p=>({...p,[k]:v}));
 const edited=r=>({...r,...(edit[r.id]||{})});
 const update=(id,k,value)=>setEdit(prev=>({...prev,[id]:{...(prev[id]||{}),[k]:value}}));
 const stageRows=(records,origin='Manual entry')=>{
  if(!editable){setNotice(t('onlyTFL'));return;}
  let added=0,skipped=0;const newRecords=[];
  const fingerprints=new Set(combined.filter(x=>!x.reversalStatus&&!x.isReversal).map(x=>x.fingerprint).filter(Boolean));
  for(const raw of records){
   const date=normalizedDate(raw.date),amount=moneyAmount(raw.amount);
   if(!date||!(amount>0)||amount>Number.MAX_SAFE_INTEGER){skipped++;continue;}
   const source=raw.source||origin;
   const transaction={...raw,customerId:customer.id,date,amount,source,description:String(raw.description||raw.purpose||'').slice(0,350),purpose:String(raw.purpose||raw.description||'').slice(0,350),counterparty:String(raw.counterparty||'').slice(0,130),reference:String(raw.reference||'').slice(0,100),provider:normalizeProvider(raw.provider||''),sourceAccount:String(raw.sourceAccount||'').slice(0,60),direction:raw.direction,account:raw.account||SOURCE_ACCOUNTS[source]||'1010',interest:moneyAmount(raw.interest||0),status:'Awaiting review',submittedAt:new Date().toISOString(),entryMethod:raw.entryMethod||entryMethod,customerConfirmed:Boolean(raw.customerConfirmed),evidenceLevel:'Customer-declared or uploaded — not independently provider-verified'};
   const suggestion=inferTransaction(transaction,learning);
   transaction.category=raw.category||suggestion.category;transaction.confidence=suggestion.confidence;transaction.classificationReason=suggestion.reason;
   transaction.id=uid('ACC');transaction.fingerprint=fingerprint(customer.id,{...transaction,source:source+'|'+transaction.provider+'|'+transaction.sourceAccount});
   if(fingerprints.has(transaction.fingerprint)){skipped++;continue;}
   const matches=findPotentialMatches(transaction,[...combined,...newRecords]);
   transaction.potentialDuplicate=matches.length>0;transaction.matchHints=matches.map(m=>m.id);
   transaction.anomaly=anomalyFor(transaction,posted);
   const evaluation=superReview(transaction,[...combined,...newRecords],learning);
   transaction.aiOutcome=evaluation.outcome;transaction.aiReasons=evaluation.reasons;
   fingerprints.add(transaction.fingerprint);newRecords.push(transaction);added++;
  }
  if(newRecords.length)mutate(next=>{
    next.accountingStaging=next.accountingStaging||[];next.accountingJournal=next.accountingJournal||[];
    for(const row of newRecords){
      const result=superReview(row,[...next.accountingStaging,...next.accountingJournal],learning);
      if(result.autoClear){
        try{
         const lines=entriesFor(row);const journal={...row,lines,status:'Posted',postedAt:new Date().toISOString(),approvedBy:'V7 rules engine',approvalMode:'V7 rules auto-cleared',evidenceLevel:'Self-declared; NOT externally verified',aiOutcome:'AUTO_CLEARED'};
         if(!checkJournal([journal]))throw Error('Unbalanced journal');
         next.accountingJournal.unshift(journal);
         next.accountingStaging.unshift({...row,status:'Posted',aiOutcome:'AUTO_CLEARED',postedAt:journal.postedAt});
         audit(next,'V7 demo rules engine','Auto-posted balanced self-declared accounting entry (UNVERIFIED)',row.id);
         continue;
        }catch{} // Fail closed; keep row in review queue.
      }
      const classified={...row,aiOutcome:result.outcome,aiReasons:result.reasons,status:result.outcome==='RETURN_TO_CUSTOMER'?'Returned for correction':'Awaiting review'};
      next.accountingStaging.unshift(classified);
      if(result.outcome!=='AUTO_CLEARED'){
       next.notifications=next.notifications||[];
       next.notifications.unshift({id:uid('N'),role:'TFL Admin',entityId:'FI-TFL',date:todayISO(),read:false,severity:'warning',title:'V7 accounting exception',body:`${customer.businessName} • ${money(row.amount)} • ${result.reasons.slice(0,2).join('; ')||'Review requested'} • ${row.id}`});
      }
    }
    audit(next,role,'V7 AI-accounting staged / auto-cleared source entries',`${customer.id} ${origin} ${added}`);
   });
  setNotice(language==='sw'?`Miamala ${added} imetumwa kwa ukaguzi; ${skipped} imerukwa kama inayojirudia au yenye taarifa pungufu.`:`${added} source records sent for review. ${skipped} repeated/invalid lines skipped.`);
  if(added)notify(t('success'));setTab('review');
 };
 const saveEntry=()=>{
  if(!editable)return;
  const description=(form.purpose||'').trim();
  const inferred=inferTransaction({...form,purpose:description},learning);
  const category=form.category||inferred.category;
  const transaction={...form,description,purpose:description,category,source:getSource(form.channel),account:getAccount(form.channel),entryMethod:'guided',customerConfirmed:true,amount:form.amount};
  if(!description){setNotice(t('purpose')+' — '+t('missing'));return;}
  const issues=superReview({...transaction,customerId:customer.id},combined,learning);
  if(issues.outcome==='RETURN_TO_CUSTOMER'){
   setNotice(`${language==='sw'?'Tafadhali sahihisha kabla ya kutuma':'Please correct before submitting'}: ${issues.reasons.join('; ')}.`);
   return;
  }
  if(!window.confirm(language==='sw'?`Thibitisha: ${money(transaction.amount)}; ${form.counterparty}; ${description}.`:`Confirm ${money(transaction.amount)}; ${form.counterparty}; ${description}.`))return;
  stageRows([transaction],'Guided entry');
  setConfirmVoice(false);
  setForm(prev=>({...EMPTY,date:todayISO(),direction:prev.direction,channel:prev.channel}));
 };
 const importStatement=async file=>{
  if(!file||!editable)return;
  if(!providerName.trim()){setNotice(t('providerName')+' — '+t('missing'));return;}
  if(!sourceAlias.trim()){setNotice(t('accountName')+' — '+t('missing'));return;}
  setBusy(true);
  try{
   if(file.size>6*1024*1024)throw Error('File exceeds 6MB; export a shorter statement.');
   const raw=await readStatementFile(file);
   const converted=checkStatementRunningBalances(statementRows(raw,providerType)).map(x=>({...x,entryMethod:'import',customerConfirmed:false,provider:providerName,sourceAccount:sourceAlias,purpose:x.description,source:providerType,evidenceFile:file.name,account:SOURCE_ACCOUNTS[providerType],counterparty:'',evidenceLevel:'Uploaded unverified statement'}));
   if(!converted.length)throw Error('No rows recognised. Expected Date plus Amount or Debit/Credit columns.');
   stageRows(converted,providerName);
  }catch(e){setNotice(`${language==='sw'?'Hitilafu ya taarifa':'Statement import failed'}: ${e.message}`);notify('Statement import needs attention.','error');}
  finally{setBusy(false);if(fileRef.current)fileRef.current.value='';}
 };
 const sample=()=>stageRows([
  {date:todayISO(),description:'Nimeuza mchele kwa Juma',purpose:'Rice sale',counterparty:'Juma',amount:20000,direction:'Income',source:'Manual cash',account:'1010',entryMethod:'guided',customerConfirmed:true,reference:'TEST-CASH-1'},
  {date:todayISO(),description:'Rice payment received',purpose:'Rice sale',counterparty:'',amount:20000,direction:'Income',source:'Mobile-money statement',account:'1030',entryMethod:'import',customerConfirmed:false,provider:'Sample mobile provider',sourceAccount:'sample-1234',reference:'TEST-STATEMENT-1'},
  {date:todayISO(),description:'Nimepokea pesa nyingi za mauzo',purpose:'Sales proceeds',counterparty:'Sample customer',amount:20000000,direction:'Income',source:'Manual cash',account:'1010',entryMethod:'guided',customerConfirmed:true,reference:'TEST-SPIKE-1'}
 ],'Fictional sample entries');
 const matchesFor=r=>findPotentialMatches(r,combined);
 const confirmCustomer=r=>{
  if(!editable)return;
  const row=edited(r),issues=missingDetails(row);
  if(issues.length){setNotice(`${t('missing')}: ${statusText(issues)}`);return;}
  mutate(next=>{next.accountingStaging=next.accountingStaging.map(x=>x.id===r.id?{...x,...(edit[r.id]||{}),customerConfirmed:true,confirmedAt:new Date().toISOString(),confirmedBy:role==='Customer'?'Customer':'TFL-assisted customer confirmation'}:x);audit(next,role,'Customer statement detail confirmed',r.id);});
  setEdit(prev=>{const next={...prev};delete next[r.id];return next;});setNotice(t('reviewed'));
 };
 const linkEvidence=(r,targetId)=>{
  if(!reviewer){setNotice(t('onlyTFL'));return;}
  if(!targetId){setNotice(t('reviewDup'));return;}
  const target=combined.find(x=>x.id===targetId);
  if(!target||target.id===r.id){setNotice(t('reviewDup'));return;}
  // Keep a separate immutable-ish evidence record. Do NOT create a journal line.
  mutate(next=>{next.accountingStaging=next.accountingStaging.map(x=>x.id===r.id?{...x,...(edit[r.id]||{}),status:'Matched evidence',linkedTo:targetId,linkedAt:new Date().toISOString(),linkedBy:'TFL reviewer'}:x);audit(next,'TFL accounting reviewer','Linked source evidence; zero added journal amount',`${r.id} → ${targetId}`);});
  setNotice(t('matchSuccess'));notify(t('matchSuccess'));
 };
 const approve=r=>{
  if(!reviewer){setNotice(t('onlyTFL'));return;}
  const row=edited(r),reviews=reviewStatus(row,combined);
  const congruence=verifyCongruence(row,learning);
  try{
   if(!row.customerConfirmed)throw Error(t('customerFirst'));
   if(reviews.gaps.length)throw Error(`${t('missing')}: ${statusText(reviews.gaps)}`);
   if(congruence.flags.length||congruence.questions.length)throw Error(`${t('missing')}: ${[...congruence.flags,...congruence.questions].join('; ')}`);
   if(reviews.matches.length && !(row.uniqueEventReviewed&&row.uniqueEventReason?.trim().length>=12))throw Error(t('reviewDup'));
   if(reviews.anomaly && !(row.anomalyReviewed&&row.anomalyExplanation?.trim().length>=12))throw Error(t('warning'));
   if(Number(row.confidence)<60 && !row.categoryReviewed)throw Error('Low-confidence purpose requires TFL accounting-category confirmation.');
   if(row.reconciliationStatus==='Running balance mismatch – investigate'&&!row.balanceCleared)throw Error(t('reviewBalances'));
   if(row.date<(customer.openingDate||'2026-10-01'))throw Error('Transaction predates the configured opening balance.');
   const lines=entriesFor(row),candidate={...row,lines,status:'Posted',postedAt:new Date().toISOString(),approvedBy:'TFL accounting reviewer',evidenceLevel:'TFL-reviewed source; not bank API-authenticated'};
   if(!checkJournal([candidate]))throw Error('Unbalanced accounting allocation.');
   mutate(next=>{
    if((next.accountingJournal||[]).some(x=>x.id===r.id||x.fingerprint===r.fingerprint))return;
    next.accountingJournal=[candidate,...(next.accountingJournal||[])];
    next.accountingStaging=next.accountingStaging.map(x=>x.id===r.id?{...x,status:'Posted',postedAt:candidate.postedAt,approvedBy:candidate.approvedBy}:x);
    if(row.description&&Number(row.confidence)<98){const k=row.description.toLowerCase().replace(/\d+/g,'').replace(/\s+/g,' ').trim();next.accountingLearning=next.accountingLearning||{};next.accountingLearning[customer.id]={...(next.accountingLearning[customer.id]||{}),[k]:row.category};}
    audit(next,'TFL accounting reviewer','Approved verified balanced transaction',`${r.id} ${row.reference||row.description}`);
   });
   setNotice(t('postedSuccess'));notify(t('postedSuccess'));
  }catch(e){setNotice(e.message);notify('Transaction needs review.','error');}
 };
 const returnToCustomer=r=>{
  if(!reviewer)return;
  const reason=(returnNotes[r.id]||'').trim();if(reason.length<10){setNotice(language==='sw'?'Andika maelezo ya marekebisho (herufi angalau 10).':'Enter a specific correction reason (at least 10 characters).');return;}
  mutate(next=>{
   next.accountingStaging=next.accountingStaging.map(x=>x.id===r.id?{...x,...(edit[r.id]||{}),status:'Returned for correction',customerConfirmed:false,returnReason:reason,returnedAt:new Date().toISOString(),aiOutcome:'RETURN_TO_CUSTOMER'}:x);
   next.notifications.unshift({id:uid('N'),role:'Customer',entityId:customer.id,date:todayISO(),read:false,severity:'warning',title:'Transaction correction requested',body:`${r.id}: ${reason}`});
   audit(next,'TFL accountant','Returned accounting source entry for correction',`${r.id}: ${reason}`);
  });setNotice(language==='sw'?'Muamala umerudishwa kwa mteja.':'Sent to customer for correction.');
 };
 const resubmit=r=>{
  const row=edited(r),evalResult=superReview({...row,entryMethod:row.entryMethod||'guided',customerConfirmed:true},combined.filter(x=>x.id!==r.id),learning);
  if(evalResult.outcome==='RETURN_TO_CUSTOMER'){setNotice(evalResult.reasons.join('; '));return;}
  mutate(next=>{next.accountingStaging=next.accountingStaging.map(x=>x.id===r.id?{...x,...(edit[r.id]||{}),customerConfirmed:true,status:'Awaiting review',returnReason:'',resubmittedAt:new Date().toISOString(),aiOutcome:evalResult.outcome,aiReasons:evalResult.reasons}:x);audit(next,'Customer','Resubmitted accounting entry after requested correction',r.id);});
  setNotice(language==='sw'?'Maelezo yamewasilishwa tena.':'Correction resubmitted.');
 };
 const reversePosted=r=>{
  if(!reviewer||r.isReversal||r.reversalStatus)return;
  try{const contra=reverseJournal(r,'TFL accountant',reversalReason[r.id]||'',uid('REV'),todayISO());
   mutate(next=>{if(next.accountingJournal.some(x=>x.reversalOf===r.id))return;next.accountingJournal=next.accountingJournal.map(x=>x.id===r.id?{...x,reversalStatus:'Reversed'}:x);next.accountingJournal.unshift(contra);audit(next,'TFL accountant','Posted offsetting journal (original retained)',`${r.id} → ${contra.id}: ${contra.reversalReason}`);});
   setNotice(language==='sw'?'Muamala umefanyiwa marekebisho ya kufuta kwa rekodi mbili.':'Reversal posted as an offsetting journal; original retained.');
  }catch(e){setNotice(e.message);}
 };
 const reject=r=>{if(!reviewer)return;mutate(next=>{next.accountingStaging=next.accountingStaging.map(x=>x.id===r.id?{...x,status:'Rejected',reviewedAt:new Date().toISOString()}:x);audit(next,'TFL accounting reviewer','Rejected source record',r.id);});setNotice(t('reject'));};
 const voice=()=>{
  const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Speech){setNotice(t('unsupported'));return;}
  if(listening){recognitionRef.current?.stop();return;}
  const rec=new Speech();rec.lang=language==='sw'?'sw-TZ':'en-US';rec.interimResults=false;
  rec.onresult=e=>{const words=e.results[0][0].transcript;setForm(old=>({...old,description:words,purpose:words,category:''}));setConfirmVoice(true);};
  rec.onerror=()=>setNotice(t('unsupported'));rec.onend=()=>setListening(false);rec.start();recognitionRef.current=rec;setListening(true);
 };
 const takePhoto=async file=>{
  if(!file)return;setValue('receiptName',file.name);
  if(photoPreview)URL.revokeObjectURL(photoPreview);
  setPhotoPreview(URL.createObjectURL(file));
  setNotice(language==='sw'?'Picha imefunguliwa kwenye kivinjari pekee. Bado haijahifadhiwa salama.':'Photo preview is browser-only; not stored securely or sent to a service.');
  if(typeof window.TextDetector==='function')try{
   const bitmap=await createImageBitmap(file);const items=await new window.TextDetector().detect(bitmap);bitmap.close?.();const text=items.map(t=>t.rawValue).join(' ');
   if(text.trim())setForm(prev=>({...prev,description:text.slice(0,350),purpose:text.slice(0,350),amount:pickAmount(text)||prev.amount}));
  }catch{}
 };
 const exportTemplate=()=>{const blob=new Blob([statementCsvTemplate()],{type:'text/csv'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='TijaPass_Bank_Mobile_Statement_Template.csv';a.click();URL.revokeObjectURL(url);};
 const exportLedger=()=>{const lines=[['Date','Reference','Provider','Description','Counterparty','Purpose','Account','Debit TZS','Credit TZS']];for(const j of report.entries)for(const l of j.lines)lines.push([j.date,j.reference||j.id,j.provider||j.source,j.description||'',j.counterparty||'',j.purpose||'',l.account,l.debit,l.credit]);const url=URL.createObjectURL(new Blob([lines.map(row=>row.map(csvSafe).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='TijaPass_V7_General_Ledger.csv';a.click();URL.revokeObjectURL(url);};
 const saveOpening=()=>{if(!reviewer||posted.length)return;mutate(next=>{Object.assign(next.customers.find(x=>x.id===customer.id),opening);audit(next,'TFL accounting reviewer','Updated demo opening balances',customer.id);});setNotice('Opening balances updated; independent verification is still required.');};
 const saveComparison=()=>{if(!reviewer)return;mutate(next=>{next.accountingReconciliations=next.accountingReconciliations||{};next.accountingReconciliations[customer.id]={...(next.accountingReconciliations[customer.id]||{}),...comparison,reviewedAt:new Date().toISOString()};audit(next,'TFL accounting reviewer','Saved manual closing balance comparison',customer.id);});setNotice('Manual balance comparison saved; not provider attestation.');};
 const eligible=role==='Financial Institution'?(data.customers||[]).filter(c=>(data.accessGrants||[]).some(g=>g.customerId===c.id&&g.fiId===fi?.id&&g.status==='Active'&&g.expiresAt>=todayISO())&&c.consentAt):data.customers;
 if(role==='Financial Institution'&&!eligible.some(c=>c.id===customer.id))return <section className="studio"><div className="panel"><ShieldCheck size={25}/><h2>{t('fiNoAccess')}</h2><p>{t('verifyHelp')}</p></div></section>;
 return <section className="studio v6-studio v7-studio">
  <div className="studio-header"><div><span className="studio-kicker">TIJAPASS • {t('newVersion')}</span><h1>{t('studio')}</h1><p>{t('intro')}</p></div><div className="studio-illustration"><BrainCircuit size={30}/><strong>{t('quality')}</strong><span>{t('confidence')}</span></div></div>
  <div className="studio-hint"><ShieldCheck size={17}/><span>{t('note')}</span></div>
  {['TFL Admin','Financial Institution'].includes(role)&&<div className="selector-strip"><select className="compact-select" value={customer.id} onChange={e=>setCustomerId(e.target.value)}>{eligible.map(c=><option key={c.id} value={c.id}>{c.businessName}</option>)}</select><span className="status blue">{customer.passportId}</span></div>}
  <div className="studio-metrics"><div><span>{t('pending')}</span><strong>{quality.pending}</strong></div><div><span>{t('posted')}</span><strong>{quality.posted}</strong></div><div><span>{t('matches')}</span><strong>{quality.linked}</strong></div><div><span>{t('balance')}</span><strong>{money(report.check)}</strong></div></div>
  <div className="studio-tabs">{[['workbench','capture'],['review','review'],['reports','reports'],['audit','audit']].map(([id,k])=><button key={id} onClick={()=>setTab(id)} className={tab===id?'selected':''}>{t(k)}</button>)}</div>
  {notice&&<div className="studio-notice" role="status">{notice}</div>}
  {tab==='workbench'&&<>
   <div className="studio-section-heading"><h2>{t('begin')}</h2><p>{t('intro')}</p></div>
   <div className="v6-methods v7-methods">{[['guided',ListChecks,'guided','guidedHint'],['import',FileSpreadsheet,'import','importHint']].map(([id,Icon,title,hint])=><button key={id} className={'v6-method'+(entryMethod===id?' active':'')} onClick={()=>{setEntryMethod(id);setNotice('')}}><span className="v6-method-icon"><Icon size={23}/></span><strong>{t(title)}</strong><small>{t(hint)}</small><span className="v6-selected">{entryMethod===id?<CheckCheck size={18}/>:<span className="v6-dot"/>}</span></button>)}</div>
   {entryMethod!=='import'?<div className="grid-2">
    <div className="panel"><h2 className="studio-panel-title"><ListChecks size={18}/> {t('guided')}</h2>
     <div className="v6-direction">{[['Income','moneyIn'],['Expense','moneyOut']].map(([val,k])=><button key={val} className={form.direction===val?'active':''} onClick={()=>setValue('direction',val)}>{t(k)}</button>)}</div>
     <div className="studio-fields">
      <Field label={t('date')}><input type="date" value={form.date} onChange={e=>setValue('date',e.target.value)}/></Field>
      <Field label={t('amount')}><input type="number" min="1" value={form.amount} onChange={e=>setValue('amount',e.target.value)} placeholder="25000"/></Field>
      <Field label={t('how')}><select value={form.channel} onChange={e=>setValue('channel',e.target.value)}>{[['Cash','cash'],['Mobile money','mobile'],['Bank','bank'],['TijaPass wallet','wallet']].map(([x,y])=><option key={x} value={x}>{t(y)}</option>)}</select></Field>
      <Field label={t(form.direction==='Income'?'paidBy':'paidTo')}><input value={form.counterparty} onChange={e=>setValue('counterparty',e.target.value)} placeholder={t('emptyCounterparty')}/></Field>
     </div>
     <Field label={t('category')}><select value={form.category||candidateCategory||''} onChange={e=>setValue('category',e.target.value)}><option value="">{language==='sw'?'Chagua aina ya muamala':'Choose a transaction type'}</option>{(proposed.confidence>=85?Array.from(new Set([proposed.category,...proposed.allowed.filter(c=>c!==proposed.category).slice(0,3)])):showMoreTypes?proposed.allowed:proposed.allowed.filter(c=>['Sales','Service income','Other business income','Inventory purchase','Rent','Utilities','Salaries','Other expense','Loan repayment','Wallet / bank transfer'].includes(c))).map(cat=><option key={cat} value={cat}>{categoryLabel(language,cat)}</option>)}</select></Field>{proposed.confidence<85&&<button className="v7-more-types" type="button" onClick={()=>setShowMoreTypes(v=>!v)}>{showMoreTypes?(language==='sw'?'Onyesha aina chache':'Show fewer choices'):(language==='sw'?'Tazama aina nyingine za miamala':'See other transaction types')}</button>}
     <Field label={t('purpose')+' *'}><textarea rows={3} required value={form.purpose} onChange={e=>setForm(old=>({...old,purpose:e.target.value,description:e.target.value,category:''}))} placeholder={t('emptyPurpose')}/></Field>
     <div className="button-row"><button className="secondary" type="button" onClick={voice} aria-label={t('dictate')}>{listening?<MicOff size={15}/>:<Mic size={15}/>} {t(listening?'stop':'dictate')}</button><small>{language==='sw'?'Sema maelezo badala ya kuandika. Kagua maandishi kabla ya kutuma.':'Speak instead of typing. Check the transcript before submitting.'}</small></div>
     {confirmVoice&&<div className="studio-hint"><Mic size={16}/>{language==='sw'?'Je, maandishi haya yanaeleza ulichosema? Sahihisha kabla ya kutuma.':'Does the text match what you said? Correct it before submitting.'}<button className="secondary" onClick={()=>setConfirmVoice(false)}>{language==='sw'?'Nimethibitisha':'I have checked'}</button></div>}
     {form.purpose.trim()&&clientCheck.outcome==='RETURN_TO_CUSTOMER'&&<div className="studio-warning" role="alert"><AlertTriangle size={16}/><div><b>{language==='sw'?'Tafadhali hakiki taarifa':'Please check these details'}</b><p>{clientCheck.reasons.join(' • ')}</p></div></div>}
     {form.purpose.trim()&&clientCheck.outcome==='ESCALATE_TO_TFL'&&<div className="studio-hint"><ShieldCheck size={16}/>{language==='sw'?'Muamala utapelekwa TFL kwa uhakiki wa ziada.':'This transaction will be sent for additional TFL review.'}</div>}
     <div className="studio-fields"><Field label={t('reference')}><input value={form.reference} onChange={e=>setValue('reference',e.target.value)}/></Field>
     {(form.category||candidateCategory)==='Wallet / bank transfer'&&<Field label={t('destination')}><select value={form.toAccount} onChange={e=>setValue('toAccount',e.target.value)}>{cashAccounts.map(([k])=><option key={k} value={k}>{accountLabel(k)}</option>)}</select></Field>}
     {(form.category||candidateCategory)==='Loan repayment'&&<Field label={t('interest')}><input type="number" min="0" value={form.interest} onChange={e=>setValue('interest',Number(e.target.value))}/></Field>}</div>
     <input ref={photoRef} hidden type="file" accept="image/*" capture="environment" onChange={e=>takePhoto(e.target.files?.[0])}/>
     <div className="button-row"><button className="secondary" onClick={()=>photoRef.current?.click()}><Camera size={16}/>{t('takePhoto')}</button><button disabled={!editable||confirmVoice||!form.purpose.trim()} className="primary" onClick={saveEntry}><Plus size={16}/>{t('submit')}</button></div>{form.receiptName&&<div className="studio-receipt">{form.receiptName} {photoPreview&&<a href={photoPreview} target="_blank" rel="noreferrer">Preview</a>}</div>}
    </div>
    <div className="panel"><h2 className="studio-panel-title"><ShieldCheck size={19}/>{t('quality')}</h2><p className="studio-sub">{t('verifyHelp')}</p><div className="v6-quality-steps">{[t('counterparty'),t('purpose'),t('missing')].map((x,i)=><div key={x}><span>{i+1}</span><p>{x}</p></div>)}</div><div className="studio-hint"><AlertTriangle size={17}/>{t('cashAlert')}</div></div>
   </div>:<div className="grid-2"><div className="panel"><h2 className="studio-panel-title"><FileSpreadsheet size={18}/>{t('statement')}</h2><p className="studio-sub">{t('importHint')}</p>
    <div className="studio-fields"><Field label={t('providerType')}><select value={providerType} onChange={e=>setProviderType(e.target.value)}><option value="Mobile-money statement">{t('mobile')}</option><option value="Bank statement">{t('bank')}</option></select></Field><Field label={t('providerName')}><input value={providerName} onChange={e=>setProviderName(e.target.value)} placeholder={language==='sw'?'Jina la benki / huduma':'e.g. Provider / institution'}/></Field><Field label={t('accountName')}><input value={sourceAlias} onChange={e=>setSourceAlias(e.target.value)} placeholder="•••• 1234 / biashara-1"/></Field></div>
    <input ref={fileRef} hidden type="file" accept=".csv,.tsv,.txt,.xlsx" onChange={e=>importStatement(e.target.files?.[0])}/>
    <div className="studio-upload"><Upload size={28}/><b>{t('chooseFile')}</b><span>{t('importCsv')}</span><button className="primary" disabled={!editable||busy} onClick={()=>fileRef.current?.click()}>{busy?'Reading…':t('upload')}</button></div><div className="button-row"><button className="secondary" onClick={exportTemplate}><Download size={15}/>{t('template')}</button><button className="secondary" onClick={sample} disabled={!editable}><Plus size={15}/>{t('sample')}</button></div>
   </div><div className="panel"><h2 className="studio-panel-title"><ShieldCheck size={18}/>{t('quality')}</h2><p className="studio-sub">{t('providerHint')}</p><div className="studio-hint"><AlertTriangle size={17}/>{t('statementNotice')}</div><div className="studio-hint"><ShieldCheck size={17}/>{t('verifyHelp')}</div><p className="studio-sub">{t('note')}</p></div></div>}
  </>}
  {tab==='review'&&<><div className="studio-section-heading"><h2>{reviewer?(language==='sw'?'Mhasibu Mkuu wa AI — Foleni ya uhakiki':'Super AI Accountant — Review queue'):t('review')}</h2><p>{reviewer?(language==='sw'?'Mfumo unapendekeza hatua; mhasibu wa TFL anaidhinisha masuala muhimu.':'The rules engine recommends actions; a TFL accountant authorises material exceptions.'):t('statementNotice')}</p></div>
   {reviewer&&<div className="studio-metrics"><div><span>{language==='sw'?'Iliyopitishwa kwa kanuni':'Rules auto-cleared'}</span><strong>{aiCounts.auto}</strong></div><div><span>{language==='sw'?'Iliyopelekwa TFL':'Escalated to TFL'}</span><strong>{aiCounts.escalated}</strong></div><div><span>{language==='sw'?'Iliyorudishwa':'Returned for correction'}</span><strong>{aiCounts.returned}</strong></div><div><span>{language==='sw'?'Inayosubiri':'Pending review'}</span><strong>{pending.length}</strong></div></div>}{pending.length===0&&<div className="panel">{t('noItems')}</div>}
   {pending.map(r=>{const e=edited(r),checks=reviewStatus(e,combined),candidateMatches=matchesFor(e);
    let postings=null,entryError='';try{postings=entriesFor(e);}catch(err){entryError=err.message;}
    const complete=checks.gaps.length===0,needsMatch=candidateMatches.length>0;
    if(r.status==='Returned for correction'&&role==='Customer')return <div className="panel studio-review v6-review" key={r.id}><h3>{language==='sw'?'Rudisha muamala baada ya kusahihisha':'Correct and resubmit'}</h3><p className="studio-warning">{r.returnReason||t('missing')}</p><div className="studio-fields"><Field label={t('counterparty')}><input value={e.counterparty||''} onChange={x=>update(r.id,'counterparty',x.target.value)}/></Field><Field label={t('purpose')}><input value={e.purpose||''} onChange={x=>update(r.id,'purpose',x.target.value)}/></Field><Field label={t('category')}><select value={e.category||''} onChange={x=>update(r.id,'category',x.target.value)}>{directionCategories(e.direction).map(cat=><option key={cat} value={cat}>{categoryLabel(language,cat)}</option>)}</select></Field></div><button className="primary" onClick={()=>resubmit(r)}>{language==='sw'?'Wasilisha tena':'Resubmit correction'}</button></div>;
    return <div className="panel studio-review v6-review" key={r.id}><div className="studio-review-top"><div><b>{e.description||e.purpose||'Transaction'}</b><span>{e.date} · {e.source} {e.provider?'· '+e.provider:''} · {e.reference||'—'}</span></div><strong>{money(e.amount)}</strong></div>
     <div className="studio-review-tags"><span className="status amber">{e.aiOutcome==='ESCALATE_TO_TFL'?(language==='sw'?'Inahitaji mhasibu':'Accountant review'):e.aiOutcome==='RETURN_TO_CUSTOMER'?(language==='sw'?'Rudisha kwa mteja':'Needs correction'):(language==='sw'?'Uhakiki':'Review')}</span><span>{t(e.direction==='Income'?'moneyIn':'moneyOut')}</span><span>{t('source')}: {e.entryMethod==='import'?t('import'):t(e.entryMethod==='text'?'narrative':'guided')}</span><span>{e.customerConfirmed?'Customer confirmed':t('customerFirst')}</span><span>{t('notVerified')}</span></div>
     <div className="studio-fields">
      <Field label={t('counterparty')}><input value={e.counterparty||''} onChange={x=>update(r.id,'counterparty',x.target.value)} placeholder={t('emptyCounterparty')}/></Field>
      <Field label={t('purpose')}><input value={e.purpose||''} onChange={x=>{update(r.id,'purpose',x.target.value);update(r.id,'description',x.target.value)}} placeholder={t('emptyPurpose')}/></Field>
      <Field label={t('category')}><select value={e.category} onChange={x=>update(r.id,'category',x.target.value)}>{directionCategories(e.direction).map(cat=><option key={cat} value={cat}>{categoryLabel(language,cat)}</option>)}</select></Field>
      <Field label={t('how')}><select value={e.account} onChange={x=>update(r.id,'account',x.target.value)}>{cashAccounts.map(([k])=><option key={k} value={k}>{accountLabel(k)}</option>)}</select></Field>
      {e.category==='Wallet / bank transfer'&&<Field label={t('destination')}><select value={e.toAccount||''} onChange={x=>update(r.id,'toAccount',x.target.value)}><option value="">—</option>{cashAccounts.map(([k])=><option key={k} value={k}>{accountLabel(k)}</option>)}</select></Field>}
      {e.category==='Loan repayment'&&<Field label={t('interest')}><input type="number" min="0" value={e.interest||0} onChange={x=>update(r.id,'interest',Number(x.target.value))}/></Field>}
     </div>
     {reviewer&&<div className="v7-review-summary"><BrainCircuit size={17}/><div><b>{language==='sw'?'Pendekezo la Mhasibu Mkuu wa AI (kanuni)':'Super AI Accountant recommendation (rules)'}</b><p>{(e.aiReasons||superReview(e,combined.filter(x=>x.id!==e.id),learning).reasons).slice(0,4).join('; ')|| (language==='sw'?'Hakuna tatizo lililopatikana.':'No issue detected.')}</p></div></div>}
     {!complete&&<div className="studio-warning"><AlertTriangle size={17}/>{t('missing')}: {statusText(checks.gaps)}</div>}
     {checks.anomaly&&<div className="studio-warning v6-danger"><AlertTriangle size={17}/><div><strong>{t('warning')}</strong><p>{language==='sw'?'Kiasi kikubwa kuliko rekodi za kawaida. Rekodi kubwa ya awali: ':'Previous maximum comparable receipt/payment: '}{money(checks.anomaly.previousMax)}</p><Field label={t('reason')}><textarea rows={2} value={e.anomalyExplanation||''} onChange={x=>update(r.id,'anomalyExplanation',x.target.value)} placeholder={t('reasonPlaceholder')}/></Field>{reviewer&&<label className="v6-checkbox"><input type="checkbox" checked={Boolean(e.anomalyReviewed)} onChange={x=>update(r.id,'anomalyReviewed',x.target.checked)}/>{t('clearAnomaly')}</label>}</div></div>}
     {needsMatch&&<div className="studio-warning v6-danger"><AlertTriangle size={17}/><div style={{width:'100%'}}><strong>{t('duplicate')}</strong><p>{candidateMatches.map(m=>`${m.id} · ${m.record.source} · ${money(m.record.amount)}`).join(' | ')}</p>{reviewer&&<><Field label={t('attach')}><select value={e.matchTarget||candidateMatches[0].id} onChange={x=>update(r.id,'matchTarget',x.target.value)}>{candidateMatches.map(m=><option key={m.id} value={m.id}>{m.id} · {m.record.source} · {m.record.status}</option>)}</select></Field><button className="secondary" onClick={()=>linkEvidence(r,e.matchTarget||candidateMatches[0].id)}><ArrowRightLeft size={15}/>{t('attach')}</button><Field label={t('reason')}><textarea rows={2} value={e.uniqueEventReason||''} onChange={x=>update(r.id,'uniqueEventReason',x.target.value)} placeholder={language==='sw'?'Kwa nini hii ni mauzo tofauti?':'Why is this a separate business event?'}/></Field><label className="v6-checkbox"><input type="checkbox" checked={Boolean(e.uniqueEventReviewed)} onChange={x=>update(r.id,'uniqueEventReviewed',x.target.checked)}/>{t('reviewDup')}</label></>}</div></div>}
     {e.reconciliationStatus==='Running balance mismatch – investigate'&&<div className="studio-warning"><AlertTriangle size={17}/><label className="v6-checkbox"><input type="checkbox" checked={Boolean(e.balanceCleared)} disabled={!reviewer} onChange={x=>update(r.id,'balanceCleared',x.target.checked)}/>{t('reviewBalances')}</label></div>}
     {reviewer&&Number(e.confidence)<60&&<label className="v6-checkbox"><input type="checkbox" checked={Boolean(e.categoryReviewed)} onChange={x=>update(r.id,'categoryReviewed',x.target.checked)}/>{language==='sw'?'TFL imethibitisha aina ya hesabu baada ya maelezo':'TFL confirmed the accounting category after clarification'}</label>}
     {entryError?<div className="studio-warning"><AlertTriangle size={15}/>{entryError}</div>:<div className="studio-journal-preview">{postings?.map((p,i)=><span key={i}>{p.debit?'DR':'CR'} {accountLabel(p.account)}: {money(p.debit||p.credit)}</span>)}</div>}
     <div className="button-row">{!e.customerConfirmed&&editable&&<button className="secondary" disabled={!complete} onClick={()=>confirmCustomer(r)}><Check size={15}/>{t('confirm')}</button>}<button className="primary" disabled={!reviewer||!complete||Boolean(entryError)||!e.customerConfirmed||Boolean(checks.anomaly&&!e.anomalyReviewed)||Boolean(needsMatch&&!e.uniqueEventReviewed)||Boolean(Number(e.confidence)<60&&!e.categoryReviewed)} onClick={()=>approve(r)}><CheckCheck size={16}/>{t('approve')}</button><button className="secondary" disabled={!reviewer} onClick={()=>reject(r)}>{t('reject')}</button></div>
     {reviewer&&<div className="v7-admin-tools"><Field label={language==='sw'?'Sababu ya kurudisha kwa mteja':'Message to customer requesting correction'}><textarea rows={2} value={returnNotes[r.id]||''} onChange={x=>setReturnNotes(o=>({...o,[r.id]:x.target.value}))} placeholder={language==='sw'?'Eleza kwa urahisi kile kinachohitaji kusahihishwa':'Explain exactly what should be corrected'}/></Field><button className="secondary" onClick={()=>returnToCustomer(r)}>{language==='sw'?'Rudisha kwa mteja':'Return to customer'}</button></div>}
    </div>})}
  </>}
  {tab==='reports'&&<><div className="v9-policy-panel"><strong>{language==='sw'?'Mikopo mingine iliyotangazwa':'Declared external loan obligations'}</strong><p>{language==='sw'?'Mikopo ya nje huathiri uwezo wa kulipa. Haiongezwi moja kwa moja kwenye pesa ya pochi au mapato.':'External loans reduce finance affordability; they do not create wallet cash or revenue automatically.'} {money((data.externalLoans||[]).filter(l=>l.customerId===customer.id&&l.status!=='Archived').reduce((a,l)=>a+Number(l.balance||0),0))}</p></div><div className="studio-section-heading"><h2>{t('reports')}</h2><p>{t('verifyHelp')}</p></div><div className="grid-3">
   <div className="panel"><h2 className="studio-panel-title"><FileText size={18}/>{t('incomeStatement')}</h2><SRow label="Business income" value={report.revenue}/><SRow label="Cost of goods sold" value={-report.cogs}/><SRow label="Gross profit" value={report.revenue-report.cogs} strong/><SRow label="Operating costs" value={-report.opex}/><SRow label="Interest" value={-report.interest}/><SRow label="Profit / (loss)" value={report.profit} strong/></div>
   <div className="panel"><h2 className="studio-panel-title"><BookOpen size={18}/>{t('businessPosition')}</h2><SRow label="Cash/bank/mobile/wallet" value={report.cash}/><SRow label="Inventory + receivables" value={report.current}/><SRow label="Fixed assets" value={report.fixed}/><SRow label="Total assets" value={report.assets} strong/><SRow label="Liabilities" value={report.liabilities}/><SRow label="Equity incl. result" value={report.closingEquity} strong/><SRow label="Accounting difference" value={report.check}/></div>
   <div className="panel"><h2 className="studio-panel-title"><RotateCcw size={18}/>{t('cashFlow')}</h2><SRow label="Operating" value={report.cashFlows.operating}/><SRow label="Investing" value={report.cashFlows.investing}/><SRow label="Financing" value={report.cashFlows.financing}/><SRow label="Internal transfers (net)" value={report.cashFlows.transfers}/><SRow label="Net cash movement" value={Object.values(report.cashFlows).reduce((x,y)=>x+y,0)} strong/></div>
  </div><div className="grid-2"><div className="panel"><h2 className="studio-panel-title">{t('balanceConfirm')}</h2><p className="studio-sub">Opening values are sample figures until independently reconciled; locked once posted entries exist.</p><div className="studio-fields">{Object.keys(opening).map(k=><Field key={k} label={k.replace(/([A-Z])/g,' $1')}><input disabled={!reviewer||posted.length>0} type={k==='openingDate'?'date':'number'} value={opening[k]} onChange={e=>setOpening(o=>({...o,[k]:k==='openingDate'?e.target.value:Number(e.target.value)}))}/></Field>)}</div><button className="secondary" disabled={!reviewer||posted.length>0} onClick={saveOpening}>{t('saveOpening')}</button></div>
   <div className="panel"><h2 className="studio-panel-title">External statement balance comparison</h2><p className="studio-sub">This is a manually entered statement balance, not provider API verification.</p>{[['1020','Bank'],['1030','Mobile money'],['1000','TijaPass wallet']].map(([k,label])=><Field key={k} label={label}><input type="number" value={comparison[k]??data.accountingReconciliations?.[customer.id]?.[k]??''} onChange={e=>setComparison(o=>({...o,[k]:e.target.value}))}/></Field>)}<button className="secondary" disabled={!reviewer} onClick={saveComparison}>{t('reconcile')}</button></div>
  </div><div className="panel"><h2 className="studio-panel-title">Trial balance</h2><div className="studio-balances">{Object.entries(report.balances).filter(([,v])=>Math.abs(v)>.001).map(([k,v])=><div key={k}><span>{accountLabel(k)}</span><b>{v>0?num(v):'—'}</b><b>{v<0?num(-v):'—'}</b></div>)}<div><b>Total</b><b>{num(Object.values(report.balances).filter(v=>v>0).reduce((x,y)=>x+y,0))}</b><b>{num(-Object.values(report.balances).filter(v=>v<0).reduce((x,y)=>x+y,0))}</b></div></div><div className="studio-hint"><ShieldCheck size={16}/>{report.journalBalanced&&Math.abs(report.check)<.01?'Debits and credits reconcile.':'Accounting equation requires investigation.'} This does not prove completeness or authenticity of imported transactions.</div>{report.negativeCashAccounts.length>0&&<div className="studio-warning"><AlertTriangle size={17}/>{language==='sw'?'Salio hasi linahitaji uchunguzi wa salio la mwanzo au taarifa ambazo hazijaingizwa.':'Negative cash/bank/mobile balance: check opening position and missing statement records before relying on these reports.'} {report.negativeCashAccounts.join(' | ')}</div>}</div></>}
  {tab==='audit'&&<><div className="grid-2"><div className="panel"><h2 className="studio-panel-title"><SearchCheck size={18}/>{t('quality')}</h2><SRow label={t('pending')} value={quality.pending} neutral/><SRow label={t('matches')} value={quality.linked} neutral/><SRow label="Posted entries" value={quality.posted} neutral/><SRow label="Confirmed source rows" value={quality.confirmed} neutral/><SRow label="Bank API authentication" value={t('undisclosed')} neutral/><SRow label="External LLM/OCR integration" value="Not connected" neutral/><p className="studio-sub">{t('verifyHelp')}</p></div>
  <div className="panel"><h2 className="studio-panel-title"><ShieldCheck size={18}/>{t('credit')}</h2><SRow label="Evidence checks passed" value={`${signal.completed}/5`} neutral/><SRow label="Months covered" value={signal.observedMonths} neutral/><SRow label="Illustrative evidence-based limit" value={signal.indicativeLimit}/><SRow label="Data-based eligibility" value={signal.eligible?'Scenario criteria met':'Evidence needed'} neutral/><div className="checklist">{signal.checks.map(([label,ok])=><div key={label}>{ok?<ShieldCheck size={15}/>:<AlertTriangle size={15}/>}<span>{label}: {ok?'Yes':'Not yet'}</span></div>)}</div><p className="studio-sub">Real underwriting, independently validated income, customer consent and institutional credit policies still required.</p></div></div>
  <div className="panel"><h2 className="studio-panel-title">{t('ledger')}</h2><div className="button-row"><button className="secondary" onClick={exportLedger}><Download size={15}/> CSV journal</button></div><div className="table-wrap"><table><thead><tr><th>Date</th><th>Description</th><th>Provider / source</th><th>Counterparty</th><th>Approval / evidence</th></tr></thead><tbody>{posted.map(j=><tr key={j.id}><td>{j.date}</td><td>{j.isReversal?'REVERSAL: ':''}{j.purpose||j.description}</td><td>{j.provider||j.source}</td><td>{j.counterparty}</td><td>{j.approvedBy||'—'} · {j.evidenceLevel||''} {j.reversalStatus||''}</td></tr>)}</tbody></table></div>{reviewer&&<div className="v7-admin-tools"><h3>{language==='sw'?'Futa kwa entry ya marekebisho (si kufuta historia)':'Reverse a posted entry (never delete history)'}</h3>{posted.filter(x=>!x.isReversal&&!x.reversalStatus).slice(0,15).map(j=><div key={j.id} className="v7-reversal-line"><span>{j.id} · {money(j.amount)} · {j.purpose}</span><input aria-label="Reversal reason" value={reversalReason[j.id]||''} onChange={e=>setReversalReason(x=>({...x,[j.id]:e.target.value}))} placeholder={language==='sw'?'Sababu ya marekebisho (lazima)':'Required reversal reason'}/><button className="secondary" onClick={()=>reversePosted(j)}><RotateCcw size={14}/>{language==='sw'?'Rejesha hesabu':'Reverse entry'}</button></div>)}</div>}</div></>}
 </section>
}
