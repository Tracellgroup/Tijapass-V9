/* TijaPass accounting workbench: auditable, deterministic journal. No AI/third-party API in this build. */
export const ACCOUNTS = {
  "1000": ["TijaPass wallet", "asset", "cash"], "1010": ["Cash on hand", "asset", "cash"],
  "1020": ["Bank account", "asset", "cash"], "1030": ["Mobile money", "asset", "cash"],
  "1100": ["Inventory", "asset", "current"], "1200": ["Trade receivables", "asset", "current"],
  "1300": ["Equipment and assets", "asset", "noncurrent"],
  "2000": ["Trade payables", "liability", "current"], "2100": ["Loans payable", "liability", "loan"],
  "3000": ["Opening equity", "equity", "equity"], "3100": ["Owner capital", "equity", "equity"],
  "3200": ["Owner drawings", "equityContra", "equity"],
  "4000": ["Sales revenue", "income", "operating"], "4010": ["Service income", "income", "operating"], "4090": ["Other business income", "income", "operating"],
  "5000": ["Cost of goods sold", "expense", "cogs"],
  "6000": ["Rent", "expense", "opex"], "6010": ["Utilities", "expense", "opex"], "6020": ["Salaries", "expense", "opex"],
  "6030": ["Transport", "expense", "opex"], "6040": ["Telecommunications", "expense", "opex"],
  "6050": ["Taxes and licences", "expense", "opex"], "6060": ["Marketing", "expense", "opex"],
  "6070": ["Maintenance", "expense", "opex"], "6090": ["Other operating expense", "expense", "opex"],
  "6900": ["Interest expense", "expense", "finance"]
};
export const CATEGORIES = [
  "Sales", "Service income", "Other business income", "Inventory purchase", "Cost of goods sold", "Rent",
  "Utilities", "Salaries", "Transport", "Telecom", "Taxes & licences", "Marketing", "Maintenance", "Other expense",
  "Wallet / bank transfer", "Loan received", "Loan repayment", "Owner capital", "Owner withdrawal", "Equipment purchase"
];
const CATEGORY_ACCOUNT = {"Sales":"4000", "Service income":"4010", "Other business income":"4090", "Inventory purchase":"1100", "Cost of goods sold":"5000", "Rent":"6000", "Utilities":"6010", "Salaries":"6020", "Transport":"6030", "Telecom":"6040", "Taxes & licences":"6050", "Marketing":"6060", "Maintenance":"6070", "Other expense":"6090", "Equipment purchase":"1300", "Loan received":"2100", "Owner capital":"3100", "Owner withdrawal":"3200"};
export const SOURCE_ACCOUNTS = {"Bank statement":"1020", "Mobile-money statement":"1030", "Manual cash":"1010", "TijaPass wallet":"1000", "Receipt / invoice":"1010", "Self-reported bank":"1020", "Self-reported mobile money":"1030"};
export const moneyAmount = v => Math.round(Number(v) || 0);
export function numberFromText(raw) {
  if (typeof raw === "number") return Number.isFinite(raw) ? Math.abs(raw) : 0;
  let val = String(raw ?? "").trim().replace(/TZS|TSh|shs/gi, "").replace(/\s/g, "");
  const neg = /^\(.*\)$/.test(val) || val.startsWith("-");
  val = val.replace(/[()]/g, "").replace(/[^0-9.,-]/g, "");
  // Tanzania data often uses 1,250,000 or 1.250.000 as thousands.
  if (/^\d{1,3}([.,]\d{3})+$/.test(val)) val = val.replace(/[.,]/g, "");
  else if (val.includes(",") && val.includes(".")) val = val.lastIndexOf(",") > val.lastIndexOf(".") ? val.replace(/\./g, "").replace(",", ".") : val.replace(/,/g, "");
  else if (val.includes(",")) val = val.replace(",", ".");
  const n = Number(val);
  return Number.isFinite(n) ? (neg ? -Math.abs(n) : n) : 0;
}
export function normalizedDate(raw) {
  const str = String(raw ?? "").trim();
  if (/^\d{4}-\d\d-\d\d/.test(str)) return str.slice(0,10);
  const m = str.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;
  if (/^\d{5}$/.test(str)) { const d = new Date(Date.UTC(1899, 11, 30) + Number(str) * 86400000); return d.toISOString().slice(0,10); }
  const test = new Date(str); return str && Number.isFinite(test.getTime()) ? test.toISOString().slice(0, 10) : "";
}
const rules = [
  [/(?:kodi ya (?:fremu|duka|nyumba)|\brent\b|landlord|pango)/i,"Rent",98],
  [/(?:umeme|luku|tanesco|electricity|water bill|dawasa|maji)/i,"Utilities",98],
  [/(?:mshahara|mishahara|salary|salaries|wages|wafanyakazi)/i,"Salaries",98],
  [/(?:stock|bidhaa za kuuza|nunua bidhaa|inventory|wholesale|supplier purchase)/i,"Inventory purchase",92],
  [/(?:gharama ya bidhaa zilizouzwa|cost of goods sold|\bcogs\b)/i,"Cost of goods sold",98],
  [/(?:nim(e|e)uza|nimeuza|mauzo|sales|sale proceeds|collection from customer|malipo ya mteja)/i,"Sales",93],
  [/(?:huduma|service fee earned|consulting income)/i,"Service income",83],
  [/(?:airtime|internet|bundle|data package|vifurushi)/i,"Telecom",92],
  [/(?:nauli|usafiri|fuel|transport|petrol|diesel)/i,"Transport",89],
  [/(?:marketing|advert|tangazo|promotion)/i,"Marketing",93],
  [/(?:repair|matengenezo|maintenance)/i,"Maintenance",92],
  [/(?:leseni|licence|license|tax|kodi ya serikali)/i,"Taxes & licences",86],
  [/(?:loan received|mkopo nimepata|mkopo umeingia|loan disbursement)/i,"Loan received",90],
  [/(?:loan repayment|marejesho ya mkopo|lipa mkopo|repayment)/i,"Loan repayment",88],
  [/(?:transfer|kuhamisha|nimehamisha|own account|between accounts|cash-in|cash-out)/i,"Wallet / bank transfer",85],
  [/(?:capital injection|mtaji niliweka|owner introduced)/i,"Owner capital",87],
  [/(?:owner withdrawal|personal use|matumizi binafsi)/i,"Owner withdrawal",88],
  [/(?:equipment|machine|freezer|fridge|computer|asset purchase)/i,"Equipment purchase",87]
];
export function smartClassify(description, direction = "Income", learned = {}) {
  const text = String(description || "").trim();
  const key = text.toLowerCase().replace(/\d+/g, "").replace(/\s+/g, " ").trim();
  if (key && learned[key]) return { category: learned[key], confidence: 98, reason: "Previously reviewed merchant / description" };
  for (const [pattern, category, confidence] of rules) if (pattern.test(text)) return { category, confidence, reason: `Matched business phrase in ${text.slice(0,50)}` };
  return { category: direction === "Income" ? "Other business income" : "Other expense", confidence: 35, reason: "Unknown purpose; needs explanation" };
}
export function fingerprint(customerId, record) {
  const desc = String(record.description || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0,60);
  const ref = String(record.reference || "").toLowerCase().replace(/\s+/g, "");
  return [customerId, record.source, record.date, moneyAmount(record.amount), record.direction, ref || desc].join("|");
}
export function entriesFor(record) {
  const amount = moneyAmount(record.amount);
  if (!(amount > 0)) throw Error("Amount must exceed zero.");
  const category = record.category;
  const cashAccount = record.account || SOURCE_ACCOUNTS[record.source] || "1010";
  if (!ACCOUNTS[cashAccount]) throw Error("Unknown payment account.");
  const debit = (account, value) => ({account, debit: value, credit: 0});
  const credit = (account, value) => ({account, debit: 0, credit: value});
  if (category === "Wallet / bank transfer") {
    if (!record.toAccount || record.toAccount === cashAccount || !ACCOUNTS[record.toAccount] || ACCOUNTS[record.toAccount][2] !== "cash") throw Error("Choose a different receiving cash/bank/mobile account.");
    return [debit(record.toAccount, amount), credit(cashAccount, amount)];
  }
  if (category === "Loan repayment") {
    const interest = moneyAmount(record.interest);
    if (interest < 0 || interest > amount) throw Error("Interest must be between zero and payment amount.");
    return [debit("2100", amount - interest), ...(interest ? [debit("6900",interest)] : []),credit(cashAccount,amount)];
  }
  if (category === "Loan received") return [debit(cashAccount,amount),credit("2100",amount)];
  if (category === "Owner capital") return [debit(cashAccount,amount),credit("3100",amount)];
  if (category === "Owner withdrawal") return [debit("3200",amount),credit(cashAccount,amount)];
  const target = CATEGORY_ACCOUNT[category];
  if (!target) throw Error("Choose a recognised accounting category.");
  if (record.direction === "Income") {
    if (ACCOUNTS[target][1] !== "income") throw Error("This category is not a business income category.");
    return [debit(cashAccount,amount),credit(target,amount)];
  }
  if (ACCOUNTS[target][1] !== "expense" && ACCOUNTS[target][1] !== "asset") throw Error("This category is not an expense/asset purchase.");
  if (category === "Cost of goods sold") return [debit("5000",amount), credit("1100",amount)];
  return [debit(target,amount),credit(cashAccount,amount)];
}
export function checkJournal(journal) {
  return (journal || []).every(x => Array.isArray(x.lines) && x.lines.length >= 2 && x.lines.every(l => ACCOUNTS[l.account] && l.debit >= 0 && l.credit >= 0 && !(l.debit && l.credit)) && Math.abs(x.lines.reduce((s,l)=>s+l.debit-l.credit,0))<0.001);
}
export function openingJournal(customer) {
  const loan = Number(customer.openingLoan || 0);
  const assets = {"1000":Number(customer.openingWallet ?? 0),"1010":Number(customer.openingCash || 0),"1020":Number(customer.openingBank || 0),"1030":Number(customer.openingMobile || 0), "1100":Number(customer.inventoryValue || 0),"1200":Number(customer.receivables || 0),"1300":Number(customer.businessAssets || 0)};
  const payables = Number(customer.payables || 0);
  const a = Object.values(assets).reduce((s,v)=>s+v,0);
  const equity = a - loan - payables;
  return {id:`OPEN-${customer.id}`,customerId:customer.id,date:customer.openingDate || "2026-10-08",description:"Illustrative opening balances (not independently reconciled)",source:"Opening snapshot",isOpening:true,lines:[...Object.entries(assets).filter(([,v])=>v>0).map(([account,v])=>({account,debit:v,credit:0})),...(payables?[{account:"2000",debit:0,credit:payables}]:[]),...(loan?[{account:"2100",debit:0,credit:loan}]:[]),...(equity>=0?[{account:"3000",debit:0,credit:equity}]:[{account:"3000",debit:-equity,credit:0}])]};
}
export function accountingReport(customer, posted = []) {
  if (!customer) return null;
  const entries=[openingJournal(customer), ...posted.filter(x=>x.customerId===customer.id && !x.reversed)];
  const balances = Object.fromEntries(Object.keys(ACCOUNTS).map(k=>[k,0]));
  for (const j of entries) for (const l of j.lines) balances[l.account] += Number(l.debit) - Number(l.credit);
  const sum = (codes) => codes.reduce((s,k)=>s+balances[k],0);
  const revenue = -sum(["4000","4010","4090"]), cogs=sum(["5000"]);
  const opex=sum(["6000","6010","6020","6030","6040","6050","6060","6070","6090"]);
  const interest=sum(["6900"]), profit=revenue-cogs-opex-interest;
  const cash=sum(["1000","1010","1020","1030"]), current=sum(["1100","1200"]), fixed=sum(["1300"]);
  const assets=cash+current+fixed, liabilities=-sum(["2000","2100"]), openingEquity=-sum(["3000","3100","3200"]);
  const cashFlows={operating:0, investing:0, financing:0, transfers:0};
  for(const j of entries.filter(x=>!x.isOpening)) {
    // Separate principal and interest by each non-cash line; internal cash-to-cash transfers net to zero.
    for (const line of j.lines.filter(l=>ACCOUNTS[l.account][2]!=="cash")) {
      const section = line.account==="1300" ? "investing" : ["2100","3100","3200"].includes(line.account) ? "financing" : "operating";
      cashFlows[section] += line.credit-line.debit;
    }
  }
  const journalBalanced=checkJournal(entries), trialBalanceNet=Object.values(balances).reduce((s,n)=>s+n,0);
  const negativeCashAccounts=Object.entries(balances).filter(([k,v])=>ACCOUNTS[k][2]==="cash" && v < -0.001).map(([k,v])=>`${ACCOUNTS[k][0]}: ${Math.round(v)}`);
  return {entries,balances,revenue,cogs,opex,interest,profit,cash,current,fixed,assets,liabilities,openingEquity,closingEquity:openingEquity+profit,check:Math.round((assets-liabilities-openingEquity-profit)*100)/100,trialBalanceNet,journalBalanced,cashFlows,negativeCashAccounts,postedCount:entries.length-1, openingIsEstimate:true};
}
export function parseDelimited(text) {
  const raw=String(text||"").replace(/^\uFEFF/,"");
  const first=raw.split(/\r?\n/)[0]||"";
  const sep=(first.match(/\t/g)||[]).length>(first.match(/,/g)||[]).length ? "\t" : first.includes(";")&& !first.includes(",") ? ";" : ",";
  const rows=[];let row=[], cell="", quoted=false;
  for(let i=0;i<raw.length;i++){
    const c=raw[i];
    if(c==='"'){ if(quoted && raw[i+1]==='"'){cell+='"';i++;} else quoted=!quoted; }
    else if(c===sep&&!quoted){row.push(cell);cell="";}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&raw[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell="";}
    else cell+=c;
  }
  row.push(cell);if(row.some(x=>x.trim()))rows.push(row);
  return rows;
}
function matchColumn(header, patterns) {return header.findIndex(h=>patterns.some(p=>p.test(h)));}
export function statementRows(rawRows, source = "Bank statement") {
  if(!rawRows.length) return [];
  const h=rawRows[0].map(s=>String(s||"").toLowerCase().trim());
  const dateIdx=matchColumn(h,[/^date$/, /transaction date/, /tarehe/, /^posted/]);
  const amountIdx=matchColumn(h,[/^amount$/, /^value$/, /^kiasi$/, /^transaction amount$/]);
  const creditIdx=matchColumn(h,[/credit/,/deposit/,/paid in/]);
  const debitIdx=matchColumn(h,[/debit/,/withdrawal/,/paid out/]);
  const descriptionIdx=matchColumn(h,[/description/,/narration/,/details/,/maelezo/,/particular/,/merchant/,/purpose/]);
  const refIdx=matchColumn(h,[/reference/,/^ref$/,/transaction id/,/receipt/,/confirmation/]);
  const balanceIdx=matchColumn(h,[/^balance$/, /running balance/,/closing balance/]);
  if(dateIdx<0 || (amountIdx<0 && creditIdx<0 && debitIdx<0)) throw Error("Could not identify date and amount columns. Use the sample template or rename headers.");
  const out=[];
  for(const r of rawRows.slice(1)){
    const date=normalizedDate(r[dateIdx]);
    if(!date)continue;
    const credit=creditIdx>=0?numberFromText(r[creditIdx]):0;
    const debit=debitIdx>=0?numberFromText(r[debitIdx]):0;
    const value=amountIdx>=0?numberFromText(r[amountIdx]):0;
    const amount=credit>0?credit:debit>0?debit:Math.abs(value);
    if(!(amount>0))continue;
    const direction=credit>0?"Income":debit>0?"Expense":value<0?"Expense":"Income";
    out.push({date,amount:moneyAmount(amount),direction,description:String(r[descriptionIdx]||"Transaction").slice(0,250),reference:String(r[refIdx]||"").trim(),source,account:SOURCE_ACCOUNTS[source]||"1020",reportedBalance: balanceIdx>=0 ? numberFromText(r[balanceIdx]) : null});
  }
  return out;
}
export function statementCsvTemplate() {
  return "Date,Description,Debit,Credit,Reference\n2026-10-01,Mauzo ya bidhaa,,200000,MP-001\n2026-10-02,Kodi ya fremu,80000,,MP-002\n2026-10-03,Nimenunua stock,300000,,MP-003\n2026-10-04,Transfer to own bank,50000,,MP-004\n";
}

export function checkStatementRunningBalances(records) {
  const out=records.map(r=>({...r,reconciliationStatus:r.reportedBalance===null?"Opening balance not provided":"Balance supplied"}));
  if (out.length < 2) return out;
  // Only check consecutive rows when the statement supplies balance and is time-ordered.
  const ascending=out[0].date <= out[out.length-1].date;
  for(let i=1;i<out.length;i++){
    const curr=ascending?out[i]:out[i-1];
    const prior=ascending?out[i-1]:out[i];
    if(curr.reportedBalance===null||prior.reportedBalance===null) continue;
    const movement=curr.direction==="Income"?curr.amount:-curr.amount;
    if(Math.abs(curr.reportedBalance-prior.reportedBalance-movement)>1)
      curr.reconciliationStatus="Running balance mismatch – investigate";
    else curr.reconciliationStatus="Running balance arithmetic matches";
  }
  return out;
}
export function accountingCreditSignal(customer, posted=[], bankReconciliation={}) {
  const valid = posted.filter(j=>j.customerId===customer.id && !j.reversed);
  const months=new Set(valid.map(j=>String(j.date).slice(0,7)));
  const statementSources=valid.filter(j=>['Bank statement','Mobile-money statement'].includes(j.source)).length;
  const report=accountingReport(customer,valid);
  const reconCount=Object.keys(bankReconciliation).filter(k=>['1020','1030'].includes(k) && bankReconciliation[k]!=='' && Math.abs(report.balances[k]-Number(bankReconciliation[k]))<=1).length;
  const kyc=Boolean(customer.nida && customer.phone && customer.consentAt && customer.status==='Verified');
  const checks=[
    ['TFL-verified KYC',kyc],['At least 12 reviewed entries',valid.length>=12],
    ['At least 3 months covered',months.size>=3],['Bank/mobile statement evidence',statementSources>=3],
    ['At least one reconciled external account',reconCount>0]
  ];
  const completed=checks.filter(([,good])=>good).length;
  const eligible=completed===checks.length && report.profit>0 && report.revenue>0 && report.negativeCashAccounts.length===0;
  const avgMonthlyOperatingProfit=months.size? Math.max(0, report.profit/months.size):0;
  return {checks,completed,eligible,observedMonths:months.size,verifiedRecords:valid.length, indicativeLimit:eligible? Math.min(5000000,Math.round(avgMonthlyOperatingProfit*2)):0,
    message:eligible?'Illustrative capacity only; lender assessment required.':'Insufficient verified/reconciled accounting history. Credit limit withheld.'};
}
