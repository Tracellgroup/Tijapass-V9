import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, AlertTriangle, ArrowDownLeft, ArrowRight, ArrowUpRight, BadgeCheck, Banknote,
  Bell, Building2, Calculator, Camera, CheckCircle2, ChevronRight, CircleDollarSign, ClipboardCheck,
  CreditCard, Database, FileCheck2, FileText, Gauge, HandCoins, IdCard, Landmark, Link2, LockKeyhole,
  Menu, PackageCheck, Plus, ReceiptText, RefreshCw, ScanLine, Search, Send, Settings, ShieldCheck,
  ShoppingCart, Smartphone, Store, Trash2, TrendingUp, UploadCloud, UserCheck, UserPlus, Users,
  WalletCards, X, Zap, Headphones, Sparkles
} from "lucide-react";
import logo from "./assets/tijapass-logo-light-transparent.png";
import logoDark from "./assets/tijapass-logo-dark-transparent.png";
import { freshSeedData } from "./data.js";
import {
  addMonths, creditProfile, duePosition, financeQuote, financialStatements, kycCompleteness, money,
  nextActionForLoan, pct, principalPaidDelta, todayISO, uid, walletAvailable
} from "./domain.js";
import AccountingStudio from "./AccountingStudio.jsx";
import {CustomerHomeV8, PricingV8, HelpDeskV8} from "./ExperienceV8.jsx";
import {accountingReport} from "./accounting.js";
import { creditAssessmentV9, offerPolicyV9, quoteV9, maxAffordablePrincipalV9, internalDebt, externalDebt, monthlyToCadence } from "./creditV9.js";
import LoanRegistryV9 from "./LoanRegistryV9.jsx";
import LoanTrackerV9 from "./LoanTrackerV9.jsx";
import {tr} from "./v6i18n.js";
import {attachPresentationTranslation} from "./v7FullLocale.js";
import "./styles.css";

const STORAGE_KEY = "tijapass-v9-unified-credit";
const ROLES = ["Customer", "TFL Admin", "Financial Institution", "Supplier"];
const TX_CATEGORIES = ["Sales", "Service income", "Other business income", "Inventory / stock", "Direct materials", "Rent", "Utilities", "Salaries", "Transport", "Telecom", "Taxes & licences", "Marketing", "Maintenance", "Other operating expense", "Owner capital", "Owner withdrawal"];
const EXPENSE_CATEGORIES = new Set(["Inventory / stock", "Direct materials", "Rent", "Utilities", "Salaries", "Transport", "Telecom", "Taxes & licences", "Marketing", "Maintenance", "Other operating expense", "Owner withdrawal"]);

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : freshSeedData();
  } catch {
    return freshSeedData();
  }
}

export default function App() {
  const [data, setData] = useState(loadData);
  const [role, setRole] = useState("Customer");
  const [screen, setScreen] = useState("dashboard");
  const [entryFocus, setEntryFocus] = useState("Income");
  const [customerId, setCustomerId] = useState("CUST-1001");
  const [fiId, setFiId] = useState("FI-A");
  const [supplierId, setSupplierId] = useState("SUP-1001");
  const [toast, setToast] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [showMoreNav,setShowMoreNav] = useState(false);
  const [language, setLanguage] = useState(() => {try{return localStorage.getItem("tijapass-language") || "en"}catch{return "en"}});
  const t = (key) => tr(language,key);
  useEffect(() => { try {localStorage.setItem("tijapass-language", language)} catch {} document.documentElement.lang = language === "sw" ? "sw" : "en"; }, [language]);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }, [data]);
  useEffect(()=>attachPresentationTranslation(document.querySelector(".app-shell"),language),[language]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    setData((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      let changed = false;
      const addOnce = (key, payload) => {
        if (next.notifications.some((n) => n.key === key)) return;
        next.notifications.unshift({ id: uid("N"), key, date: todayISO(), read: false, severity: "info", ...payload });
        changed = true;
      };
      next.loans.filter((l) => ["Active", "Overdue"].includes(l.status)).forEach((loan) => {
        const cust = next.customers.find((c) => c.id === loan.customerId);
        const lender = next.financialInstitutions.find((f) => f.id === loan.fiId);
        const pos = duePosition(next, loan.customerId);
        if (pos.overdue > 0) {
          addOnce(`overdue-customer-${loan.id}-${todayISO()}`, { role: "Customer", entityId: cust.id, severity: "warning", title: "Repayment overdue", body: `${money(pos.overdue)} is overdue on ${loan.id}. Fund your business wallet or contact TFL.` });
          addOnce(`overdue-fi-${loan.id}-${todayISO()}`, { role: "Financial Institution", entityId: lender.id, severity: "warning", title: "Customer repayment overdue", body: `${cust.businessName} has ${money(pos.overdue)} overdue on ${loan.id}.` });
          addOnce(`overdue-tfl-${loan.id}-${todayISO()}`, { role: "TFL Admin", entityId: "FI-TFL", severity: "warning", title: "Collections action required", body: `${cust.businessName} has an overdue amount on ${loan.id}.` });
        } else if (pos.nextDue) {
          const days = Math.ceil((new Date(pos.nextDue.dueDate) - new Date(todayISO())) / 86400000);
          if (days >= 0 && days <= 7) addOnce(`due-soon-${loan.id}-${pos.nextDue.dueDate}`, { role: "Customer", entityId: cust.id, severity: "warning", title: "Repayment due soon", body: `${money(pos.nextDue.remaining)} is due on ${pos.nextDue.dueDate}. Keep sufficient funds in your business wallet.` });
        }
      });
      next.financialInstitutions.filter((f) => !f.isTFL).forEach((institution) => {
        const w = next.wallets.find((x) => x.id === institution.walletId);
        if (w && w.balance < 5000000) addOnce(`low-fi-wallet-${institution.id}`, { role: "Financial Institution", entityId: institution.id, severity: "warning", title: "Funding wallet low", body: `Your funding wallet is ${money(w.balance)}. Top up before approving further disbursements.` });
      });
      const pendingManual = next.ledger.filter((t) => t.status === "Pending verification").length;
      if (pendingManual) addOnce(`pending-data-${pendingManual}`, { role: "TFL Admin", entityId: "FI-TFL", severity: "info", title: "Data evidence awaiting verification", body: `${pendingManual} business transaction record(s) are excluded from statements/scoring until verified.` });
      return changed ? next : prev;
    });
  }, []);

  const customer = data.customers.find((x) => x.id === customerId) || data.customers[0];
  const fi = data.financialInstitutions.find((x) => x.id === fiId) || data.financialInstitutions[0];
  const supplier = data.suppliers.find((x) => x.id === supplierId) || data.suppliers[0];
  const selectedWallet = role === "Customer" ? data.wallets.find((w) => w.id === customer.walletId)
    : role === "Financial Institution" ? data.wallets.find((w) => w.id === fi.walletId)
      : role === "Supplier" ? data.wallets.find((w) => w.id === supplier.walletId)
        : data.wallets.find((w) => w.id === "W-TFL");

  const notify = (message, type = "success") => setToast({ message, type });
  const mutate = (fn) => setData((prev) => {
    const next = JSON.parse(JSON.stringify(prev));
    fn(next);
    return next;
  });

  function addNotification(next, { role: targetRole, entityId, severity = "info", title, body }) {
    next.notifications.unshift({ id: uid("N"), role: targetRole, entityId, severity, title, body, date: todayISO(), read: false });
  }
  function audit(next, actor, action, subject) {
    next.audit.unshift({ id: uid("A"), date: new Date().toISOString(), actor, action, subject });
  }
  function postTransfer(next, { fromWalletId = null, toWalletId = null, amount, category, direction = null, source = "TijaPass wallet", customerId: relatedCustomer = null, loanId = null, counterparty = "", reference = "", note = "", verified = true, status = "Completed" }) {
    const value = Math.max(0, Number(amount) || 0);
    if (!value) throw new Error("Enter an amount greater than zero.");
    const from = fromWalletId ? next.wallets.find((w) => w.id === fromWalletId) : null;
    const to = toWalletId ? next.wallets.find((w) => w.id === toWalletId) : null;
    if (from && from.balance < value) throw new Error("Insufficient wallet balance.");
    if (from) from.balance -= value;
    if (to) to.balance += value;
    const tx = { id: uid("TX"), date: todayISO(), fromWalletId, toWalletId, amount: value, category, direction, source, verified, status, customerId: relatedCustomer, loanId, counterparty, reference: reference || uid("REF"), note };
    next.ledger.unshift(tx);
    return tx;
  }

  function resetPlatform() {
    if (!window.confirm("Reset the demonstration data? This removes browser changes, including Accounting Studio records.")) return;
    const fresh = freshSeedData();
    setData(fresh);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    notify("Demonstration data reset.");
  }

  function changeRole(nextRole) {
    setRole(nextRole);
    const defaults = { Customer: "dashboard", "TFL Admin": "dashboard", "Financial Institution": "dashboard", Supplier: "supplier" };
    setScreen(defaults[nextRole]);
    setMobileNav(false);
    setShowMoreNav(false);
  }

  const nav = navFor(role);
  const shownNav=role==="Customer"&&!showMoreNav?nav.filter(([k])=>["dashboard","accounting","statements","finance","wallet","help","plans"].includes(k)):nav;
  const currentEntityId=role==="Customer"?customer.id:role==="Financial Institution"?fi.id:role==="Supplier"?supplier.id:"FI-TFL";
  function recordActivity(direction){setEntryFocus(direction);setScreen("accounting");}

  const unread = data.notifications.filter((n) => !n.read && notificationBelongs(n, role, customerId, fiId, supplierId)).length;

  return <div className="app-shell" data-lang={language}>
    <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
      <div className="brand"><img src={logoDark} alt="TijaPass" /><button className="mobile-close" onClick={() => setMobileNav(false)}><X size={20} /></button></div>
      <div className="role-card"><span>{t("workspace")}</span><strong>{t(({Customer:"roleCustomer", "TFL Admin":"roleTFL", "Financial Institution":"roleFI", Supplier:"roleSupplier"})[role])}</strong><small>{workspaceName(role, customer, fi, supplier)}</small></div>
      <nav>{shownNav.map(([key, label, Icon]) => <button key={key} className={screen === key ? "nav active" : "nav"} onClick={() => { setScreen(key); setMobileNav(false); }}><Icon size={18} /><span>{t(({dashboard:role==="Customer"?"myBusiness":role==="Financial Institution"?"portfolio":"overview",onboarding:role==="Customer"?"myProfile":"onboarding",passport:"passport",accounting:"studio",transactions:"transactions",finance:role==="TFL Admin"?"financeOps":"finance",statements:"statements",supplier:role==="Customer"?"suppliers":role==="Financial Institution"?"supplierOps":role==="Supplier"?"quotes":"supplierOps",wallet:role==="TFL Admin"?"treasury":role==="Financial Institution"?"fundingWallet":role==="Supplier"?"supplierWallet":"walletNav",notifications:"alerts",controls:"controls",partners:"partners",products:"products",plans:"packages",help:"support"})[key]||label)}</span>{key === "notifications" && unread > 0 && <em>{unread}</em>}</button>)}</nav>
      {role==="Customer"&&<button className="v8-sidebar-more" onClick={()=>setShowMoreNav(v=>!v)}>{showMoreNav?(language==="sw"?"Ficha menyu ya ziada":"Hide extra menu"):(language==="sw"?"Onyesha huduma nyingine":"See more features")}</button>}
      <button className="v8-sidebar-help" onClick={()=>{setScreen("help");setMobileNav(false)}}><Headphones size={17}/>{language==="sw"?"Uliza TijaPass Msaidizi":"Ask TijaPass Msaidizi"}</button>
      <div className="side-note"><ShieldCheck size={17} /><div><b>{language==="sw"?"Mfumo unaodhibitiwa":"Controlled ecosystem"}</b><span>{language==="sw"?"Taarifa zilizohakikiwa • Ruhusa za kuona • Daftari la miamala":"Verified data • permissioned access • traceable wallet ledger"}</span></div></div>
    </aside>

    <main>
      <header className="topbar">
        <div className="top-left"><button className="menu" onClick={() => setMobileNav(true)}><Menu size={20} /></button><img src={logo} alt="TijaPass" /><div><span>{t("welcome")}</span><b>{screen==="accounting"?t("studio"):pageLabel(screen)}</b></div></div>
        <div className="top-actions">
          <label className="language-picker" aria-label={t("language")}><span>{t("language")}</span><select value={language} onChange={e=>setLanguage(e.target.value)}><option value="en">English</option><option value="sw">Kiswahili</option></select></label>
          {role === "Customer" && <CompactSelect value={customerId} onChange={setCustomerId} options={data.customers.map((c) => [c.id, c.businessName])} />}
          {role === "Financial Institution" && <CompactSelect value={fiId} onChange={setFiId} options={data.financialInstitutions.map((f) => [f.id, f.name])} />}
          {role === "Supplier" && <CompactSelect value={supplierId} onChange={setSupplierId} options={data.suppliers.map((s) => [s.id, s.name])} />}
          <select className="role-select" value={role} onChange={(e) => changeRole(e.target.value)}>{ROLES.map((r) => <option key={r} value={r}>{t(({Customer:"roleCustomer", "TFL Admin":"roleTFL", "Financial Institution":"roleFI", Supplier:"roleSupplier"})[r])}</option>)}</select>
          <button className="balance-chip" onClick={() => setScreen("wallet")}><WalletCards size={17} /><span>{money(selectedWallet?.balance || 0)}</span></button>
          <button className="bell-btn" title={language==="sw"?"Msaada":"Help"} onClick={()=>setScreen("help")}><Headphones size={18}/></button>
          <button className="bell-btn" onClick={() => setScreen("notifications")}><Bell size={18} />{unread > 0 && <span>{unread}</span>}</button>
        </div>
      </header>

      <div className="content">
        {screen === "dashboard" && (role==="Customer"?<CustomerHomeV8 data={data} customer={customer} language={language} setScreen={setScreen} recordActivity={recordActivity}/>:<Dashboard data={data} role={role} customer={customer} fi={fi} supplier={supplier} setScreen={setScreen} />)}
        {screen === "onboarding" && <Onboarding data={data} role={role} mutate={mutate} customer={customer} setCustomerId={setCustomerId} notify={notify} audit={audit} addNotification={addNotification} />}
        {screen === "passport" && <Passport data={data} customer={customer} setCustomerId={setCustomerId} language={language} />}
        {screen === "accounting" && <AccountingStudio key={`studio-${customer.id}-${entryFocus}`} initialDirection={entryFocus} data={data} customer={customer} role={role} fi={fi} mutate={mutate} audit={audit} notify={notify} setCustomerId={setCustomerId} language={language} />}
        {screen === "transactions" && <Transactions data={data} role={role} customer={customer} mutate={mutate} postTransfer={postTransfer} audit={audit} notify={notify} />}
        {screen === "finance" && <Finance language={language} data={data} role={role} customer={customer} fi={fi} mutate={mutate} postTransfer={postTransfer} audit={audit} addNotification={addNotification} notify={notify} />}
        {screen === "statements" && <AccountingStudio key={`reports-${customer.id}`} initialTab="reports" data={data} customer={customer} role={role} fi={fi} mutate={mutate} audit={audit} notify={notify} setCustomerId={setCustomerId} language={language} />}
        {screen === "wallet" && <Wallet data={data} role={role} customer={customer} fi={fi} supplier={supplier} mutate={mutate} postTransfer={postTransfer} audit={audit} addNotification={addNotification} notify={notify} />}
        {screen === "partners" && <Partners data={data} mutate={mutate} fi={fi} setFiId={setFiId} notify={notify} audit={audit} />}
        {screen === "products" && <Products data={data} fi={fi} mutate={mutate} notify={notify} audit={audit} />}
        {screen === "supplier" && <SupplierOperations data={data} role={role} customer={customer} supplier={supplier} mutate={mutate} notify={notify} audit={audit} addNotification={addNotification} />}
        {screen === "notifications" && <Notifications data={data} role={role} customer={customer} fi={fi} supplier={supplier} mutate={mutate} />}
        {screen === "controls" && <Controls data={data} mutate={mutate} resetPlatform={resetPlatform} />}
        {screen === "plans" && <PricingV8 data={data} role={role} entityId={currentEntityId} language={language} mutate={mutate} notify={notify} audit={audit}/>}
        {screen === "help" && <HelpDeskV8 data={data} role={role} entityId={currentEntityId} language={language} mutate={mutate} notify={notify} audit={audit}/>}
      </div>
    </main>
    {toast && <div className={`toast ${toast.type}`}><CheckCircle2 size={18} /><span>{toast.message}</span></div>}
  </div>;
}

function navFor(role) {
  const common = [["dashboard", "Overview", Activity], ["wallet", "Wallet", WalletCards], ["notifications", "Alerts", Bell], ["plans", "Packages", Sparkles], ["help", "Help & Support", Headphones]];
  if (role === "Customer") return [["dashboard", "My Business", Gauge], ["onboarding", "My Profile", UserCheck], ["passport", "Credit Passport", BadgeCheck], ["accounting", "Smart Accounting", Calculator], ["transactions", "Business Transactions", ReceiptText], ["finance", "Finance", HandCoins], ["statements", "Statements", FileText], ["supplier", "Suppliers", Store], ["wallet", "Wallet", WalletCards], ["notifications", "Alerts", Bell], ["plans", "Packages", Sparkles], ["help", "Help & Support", Headphones]];
  if (role === "Financial Institution") return [["dashboard", "Portfolio", Landmark], ["passport", "Customer Review", Users], ["products", "Products & Pricing", Calculator], ["accounting", "Financial Evidence", Calculator], ["finance", "Finance Decisions", HandCoins], ["wallet", "Funding Wallet", WalletCards], ["statements", "Statements", FileText], ["notifications", "Alerts", Bell], ["plans", "Packages", Sparkles], ["help", "Help & Support", Headphones]];
  if (role === "Supplier") return [["supplier", "Quotes & Orders", ShoppingCart], ["wallet", "Supplier Wallet", WalletCards], ["transactions", "Transactions", ReceiptText], ["notifications", "Alerts", Bell], ["plans", "Packages", Sparkles], ["help", "Help & Support", Headphones]];
  return [...common.slice(0, 1), ["onboarding", "MSME Onboarding", UserPlus], ["passport", "Customer Passports", BadgeCheck], ["accounting", "Smart Accounting", Calculator], ["transactions", "Data Quality", Database], ["finance", "Finance Operations", HandCoins], ["partners", "Partners & FIs", Building2], ["supplier", "Supplier Operations", Store], ["wallet", "Treasury & Wallets", WalletCards], ["statements", "Statements", FileText], ["notifications", "Alerts", Bell], ["controls", "Controls", Settings], ["plans", "Packages", Sparkles], ["help", "Support Queue", Headphones]];
}

function workspaceName(role, customer, fi, supplier) {
  if (role === "Customer") return customer.businessName;
  if (role === "Financial Institution") return fi.name;
  if (role === "Supplier") return supplier.name;
  return "Tracell Finance Limited";
}
function pageLabel(screen) {
  const labels = { dashboard: "Overview", onboarding: "Onboarding & KYC", passport: "Digital Credit Passport", accounting: "Smart Accounting & Data Evidence", transactions: "Business Data & Ledger", finance: "Finance Lifecycle", statements: "Financial Statements", wallet: "Wallet & Payments", partners: "Partners & Financial Institutions", products: "Products & Pricing", supplier: "Supplier Commerce", notifications: "Notifications", controls: "Governance & Controls", plans: "Packages", help: "Help & Support" };
  return labels[screen] || "TijaPass";
}
function notificationBelongs(n, role, customerId, fiId, supplierId) {
  if (role === "TFL Admin") return n.role === "TFL Admin";
  if (role === "Customer") return n.role === "Customer" && n.entityId === customerId;
  if (role === "Financial Institution") return n.role === "Financial Institution" && n.entityId === fiId;
  return n.role === "Supplier" && n.entityId === supplierId;
}

function Dashboard({ data, role, customer, fi, supplier, setScreen }) {
  if (role === "Customer") return <CustomerDashboard data={data} customer={customer} setScreen={setScreen} />;
  if (role === "Financial Institution") return <FIDashboard data={data} fi={fi} setScreen={setScreen} />;
  if (role === "Supplier") return <SupplierDashboard data={data} supplier={supplier} setScreen={setScreen} />;
  const portfolio = data.loans.filter((l) => ["Active", "Overdue"].includes(l.status)).reduce((s, l) => s + Number(l.outstanding || 0), 0);
  const verified = data.customers.filter((c) => c.status === "Verified").length;
  const fees = data.ledger.filter((t) => ["TFL access fee", "TFL disbursement fee", "TFL collection fee"].includes(t.category) && t.toWalletId === "W-TFL").reduce((s, t) => s + t.amount, 0);
  const pendingData = data.ledger.filter((t) => t.status === "Pending verification").length;
  return <section>
    <Hero eyebrow="TFL OPERATIONS" title="One operating system for MSME identity, transactions, finance and repayment." text="TFL recruits, trains, verifies and monitors MSMEs while the platform converts reliable business activity into finance-ready records." actions={<><button className="primary" onClick={() => setScreen("accounting")}><Calculator size={17} />Open Smart Accounting</button><button className="secondary" onClick={() => setScreen("onboarding")}><UserPlus size={17} />Onboard MSME</button><button className="secondary" onClick={() => setScreen("finance")}><HandCoins size={17} />Finance pipeline</button></>} />
    <MetricGrid items={[[Users, data.customers.length, "Registered MSMEs"], [BadgeCheck, verified, "Verified customers"], [CircleDollarSign, money(portfolio), "Active finance outstanding"], [Banknote, money(fees), "TFL platform fees recorded"], [AlertTriangle, pendingData, "Data records to verify"], [Building2, data.financialInstitutions.length, "Registered financing institutions"]]} />
    <div className="grid-2">
      <Panel title="Ecosystem operating flow"><Flow steps={["Recruit & train", "Verify identity/business", "Capture business transactions", "Build statements & score", "FI review & offer", "Supplier disbursement", "Standing-order repayment"]} /></Panel>
      <Panel title="Priority controls"><ControlLine icon={Database} title="Reliable data first" text="Only completed, verified or trusted-source transactions feed statements and scoring." /><ControlLine icon={WalletCards} title="Wallet-led business activity" text="Income, expenses, supplier settlement and repayment create a traceable ledger." /><ControlLine icon={ShieldCheck} title="Permissioned FI access" text="Non-TFL FIs pay the configured information-view fee before reviewing customer detail." /><ControlLine icon={Bell} title="Continuous intervention" text="Warnings are generated for overdue repayments, missing KYC, pending evidence and low funding wallets." /></Panel>
    </div>
  </section>;
}

function CustomerDashboard({ data, customer, setScreen }) {
  const profile = creditProfile(data, customer.id);
  const fs = financialStatements(data, customer.id);
  const wallet = data.wallets.find((w) => w.id === customer.walletId);
  const accountingEntries = (data.accountingJournal||[]).filter(j=>j.customerId===customer.id&&!j.reversed);
  const journalView=accountingEntries.length?accountingReport(customer,accountingEntries):null;
  const due = duePosition(data, customer.id);
  const active = data.loans.find((l) => l.customerId === customer.id && ["Active", "Overdue"].includes(l.status));
  return <section>
    <Hero eyebrow="MY BUSINESS" title={`Welcome, ${customer.owner}`} text="Use TijaPass for business collections, expenses, supplier payments and finance. Consistent verified activity strengthens your statements, score and finance limit." actions={<><button className="primary" onClick={() => setScreen("accounting")}><Calculator size={17} />Record business activity</button><button className="secondary" onClick={() => setScreen("finance")}><HandCoins size={17} />Request finance</button></>} />
    <MetricGrid items={[[WalletCards, money(wallet?.balance), "Demo wallet balance"], [Gauge, profile.score, "Qualification score /100"], [CircleDollarSign, money(profile.limit), "Illustrative finance capacity"], [TrendingUp, money(journalView?.revenue ?? fs?.revenue ?? 0), journalView?"Accounting journal revenue (pilot)":"Demo historical revenue"], [ShieldCheck, `${fs?.coverage || 0}%`, "Historical data (demo)"], [AlertTriangle, money(due.overdue), due.overdue ? "Overdue amount" : "No overdue amount"]]} />
    <div className="grid-3">
      <Panel title="Finance position"><DataRow label="Active facility" value={active?.id || "None"} /><DataRow label="Outstanding" value={money(active?.outstanding || 0)} /><DataRow label="Next payment" value={due.nextDue ? `${money(due.nextDue.remaining)} • ${due.nextDue.dueDate}` : "No scheduled payment"} /><DataRow label="Standing instruction" value={active?.standingOrder ? "Active" : "Not active"} /><button className="link-button" onClick={() => setScreen("finance")}>Open finance details <ChevronRight size={15} /></button></Panel>
      <Panel title="Business health"><Signal label="Identity & KYC" value={profile.kyc} /><Signal label="Reviewed accounting coverage" value={profile.transactionScore} /><Signal label="Repayment performance" value={(profile.repaymentScore ?? 0)} /><Signal label="TFL monitoring" value={customer.monitoringScore} /></Panel>
      <Panel title="What improves your limit?"><Checklist items={["Receive business sales through TijaPass / linked channels", "Pay genuine business expenses from the business wallet", "Keep invoices and supplier records complete", "Repay on or before due dates", "Keep profile, licence and business details current"]} /></Panel>
    </div>
  </section>;
}

function FIDashboard({ data, fi, setScreen }) {
  const wallet = data.wallets.find((w) => w.id === fi.walletId);
  const loans = data.loans.filter((l) => l.fiId === fi.id);
  const pipeline = loans.filter((l) => ["Submitted", "Under review", "Offered", "Accepted", "Ready to disburse"].includes(l.status));
  const active = loans.filter((l) => ["Active", "Overdue"].includes(l.status));
  const outstanding = active.reduce((s, l) => s + Number(l.outstanding || 0), 0);
  return <section>
    <Hero eyebrow="FINANCING INSTITUTION" title={`${fi.name} finance workspace`} text="Price your products, pay for permissioned customer information, make transparent offers, fund the institution wallet and disburse through controlled TijaPass routes." actions={<><button className="primary" onClick={() => setScreen("finance")}><HandCoins size={17} />Review pipeline</button><button className="secondary" onClick={() => setScreen("products")}><Calculator size={17} />Manage products</button></>} />
    <MetricGrid items={[[WalletCards, money(wallet?.balance), "Available funding wallet"], [ClipboardCheck, pipeline.length, "Applications in pipeline"], [CircleDollarSign, money(outstanding), "Portfolio outstanding"], [Users, data.accessGrants.filter((a) => a.fiId === fi.id && a.status === "Active").length, "Permissioned customer views"], [Calculator, data.products.filter((p) => p.fiId === fi.id && p.status === "Active").length, "Active finance products"], [AlertTriangle, active.filter((l) => l.status === "Overdue").length, "Overdue facilities"]]} />
    <div className="grid-2"><Panel title="Funding rule"><Callout icon={WalletCards}>An institution must maintain sufficient wallet funds before loan disbursement. Supplier-direct settlement is the normal route; customer-wallet disbursement requires an approved exception where the product allows it.</Callout></Panel><Panel title="TFL commercial charges"><DataRow label="Information view" value={fi.isTFL ? "Internal / exempt" : money(data.settings.viewFee)} /><DataRow label="Disbursement fee" value={fi.isTFL ? "Internal / exempt" : pct(data.settings.disbursementFeePct)} /><DataRow label="Optional collection service" value={pct(data.settings.collectionFeePct)} /></Panel></div>
  </section>;
}

function SupplierDashboard({ data, supplier, setScreen }) {
  const wallet = data.wallets.find((w) => w.id === supplier.walletId);
  const quotes = data.quotes.filter((q) => q.supplierId === supplier.id);
  const invoices = data.invoices.filter((q) => q.supplierId === supplier.id);
  return <section><Hero eyebrow="SUPPLIER" title={`${supplier.name} commerce workspace`} text="Issue quotations, receive purchase orders, invoice financed purchases, confirm delivery and manage settlement from one controlled supplier account." actions={<><button className="primary" onClick={() => setScreen("supplier")}><ShoppingCart size={17} />Open orders</button><button className="secondary" onClick={() => setScreen("wallet")}><WalletCards size={17} />Open wallet</button></>} /><MetricGrid items={[[WalletCards, money(wallet?.balance), "Supplier wallet"], [FileText, quotes.length, "Quotations"], [ShoppingCart, data.orders.filter((o) => o.supplierId === supplier.id).length, "Purchase orders"], [ReceiptText, invoices.length, "Invoices"], [PackageCheck, invoices.filter((i) => i.deliveryStatus === "Delivered").length, "Deliveries confirmed"], [Link2, data.channels.filter((c) => c.walletId === supplier.walletId).length, "Linked cash channels"]]} /></section>;
}

function Onboarding({ data, role, mutate, customer, setCustomerId, notify, audit, addNotification }) {
  const tflReviewer = role === "TFL Admin";
  const [draft, setDraft] = useState({ ...customer });
  useEffect(() => setDraft({ ...customer }), [customer.id]);
  const createNew = () => {
    if (!tflReviewer) return notify("Only TFL staff can register a new MSME.","error");
    let newId = "";
    mutate((next) => {
      newId = uid("CUST");
      const walletId = uid("W-CUST");
      const passportId = `TP-${String(next.customers.length + 1001)}`;
      next.customers.unshift({ id: newId, passportId, businessName: "New MSME", owner: "", gender: "Female", dob: "", phone: "", email: "", nida: "", sector: "", businessAddress: "", residentialAddress: "", operatingMonths: 0, statementMonths: 6, businessAssets: 0, inventoryValue: 0, receivables: 0, payables: 0, monitoringScore: 0, status: "Onboarding", trainingStatus: "Not started", profilePhoto: "", idDocument: "", consentAt: "", consentScope: "Credit passport, statements, finance review", walletId, preferredSupplierId: next.suppliers[0]?.id || null, assignedOfficer: "", verificationNotes: "" });
      next.wallets.push({ id: walletId, entityType: "Customer", entityId: newId, name: `${passportId} Business Wallet`, balance: 0, status: "Pending activation", currency: "TZS" });
      audit(next, "TFL Admin", "Created new MSME onboarding record", newId);
    });
    setCustomerId(newId);
    notify("New MSME onboarding record created. Complete identity, business and consent fields.");
  };
  const completeness = kycCompleteness(draft);
  const fileInput = useRef(null);
  const idInput = useRef(null);
  const set = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  const handleImage = (file, key) => {
    if (!file) return;
    if (file.size > 2_000_000) return notify("Please use an image below 2 MB.", "error");
    const reader = new FileReader();
    reader.onload = () => set(key, reader.result);
    reader.readAsDataURL(file);
  };
  const save = () => {
    mutate((next) => {
      const target = next.customers.find((c) => c.id === customer.id);
      const clientKeys = ["owner","phone","dob","nida","email","gender","businessName","sector","businessAddress","residentialAddress","operatingMonths","profilePhoto","idDocument","consentAt","businessAssets","inventoryValue","receivables","payables"];
      const staffKeys = ["assignedOfficer","monitoringScore","verificationNotes","trainingStatus"];
      const changedIdentity = ["owner","phone","dob","nida","businessName","idDocument","profilePhoto"].some(k=>target[k]!==draft[k]);
      for (const key of [...clientKeys,...(tflReviewer?staffKeys:[])]) target[key] = draft[key];
      if(!tflReviewer && changedIdentity && target.status==='Verified')target.status='Monitoring';
      audit(next, tflReviewer?"TFL Admin":"Customer", "Updated permitted onboarding fields", customer.id);
      addNotification(next, { role: "TFL Admin", entityId: "FI-TFL", title: "Customer profile updated", body: `${draft.businessName} onboarding information was updated and is ready for review.` });
    });
    notify("Customer profile saved.");
  };
  const verify = () => {
    if(!tflReviewer)return notify("Only TFL admin may approve KYC verification.","error");
    if (completeness < 80) return notify("Complete at least 80% of required onboarding fields before TFL verification.", "error");
    mutate((next) => {
      const target = next.customers.find((c) => c.id === customer.id);
      target.status = "Verified";
      target.verificationNotes = `${target.verificationNotes || ""} Verified by TFL on ${todayISO()}.`;
      audit(next, "TFL Officer", "Verified customer KYC and business profile", customer.id);
      addNotification(next, { role: "Customer", entityId: customer.id, severity: "success", title: "Profile verified", body: "TFL has verified your identity and business profile." });
    });
    notify("TFL verification completed.");
  };
  return <section>
    <SectionTitle title="Customer onboarding & KYC" text="Mobile-first identity, business verification, training and monitoring. Customer captures information; TFL validates accuracy before finance use." />
    <div className="selector-strip"><b>Customer</b><CompactSelect value={customer.id} onChange={setCustomerId} options={data.customers.map((c) => [c.id, `${c.passportId} • ${c.businessName}`])} />{tflReviewer&&<button className="mini-action" onClick={createNew}><Plus size={14} />New MSME</button>}<span className={`status ${customer.status === "Verified" ? "green" : "amber"}`}>{customer.status}</span><span className="progress-label">Completeness {completeness}%</span></div>
    <div className="onboarding-layout">
      <div className="stack">
        <Panel title="1. Identity & contact">
          <div className="photo-grid">
            <div className="photo-box">{draft.profilePhoto?.startsWith("data:") ? <img src={draft.profilePhoto} alt="Customer" /> : <Camera size={34} />}<button onClick={() => fileInput.current?.click()}><Camera size={15} />Take / upload photo</button><input ref={fileInput} hidden type="file" accept="image/*" capture="user" onChange={(e) => handleImage(e.target.files?.[0], "profilePhoto")} /></div>
            <div className="photo-box id-box">{draft.idDocument?.startsWith("data:") ? <img src={draft.idDocument} alt="ID" /> : <IdCard size={34} />}<button onClick={() => idInput.current?.click()}><ScanLine size={15} />Scan / photograph ID</button><input ref={idInput} hidden type="file" accept="image/*,application/pdf" capture="environment" onChange={(e) => handleImage(e.target.files?.[0], "idDocument")} /></div>
          </div>
          <FormGrid><Field label="Owner full name" value={draft.owner} onChange={(v) => set("owner", v)} /><Field label="Mobile phone" value={draft.phone} onChange={(v) => set("phone", v)} /><Field type="date" label="Date of birth" value={draft.dob} onChange={(v) => set("dob", v)} /><Field label="NIDA number" value={draft.nida} onChange={(v) => set("nida", v)} /><Field label="Email" value={draft.email} onChange={(v) => set("email", v)} /><SelectField label="Gender" value={draft.gender} onChange={(v) => set("gender", v)} options={["Female", "Male", "Other / prefer not to say"]} /></FormGrid>
        </Panel>
        <Panel title="2. Business information"><FormGrid><Field label="Business / trading name" value={draft.businessName} onChange={(v) => set("businessName", v)} /><Field label="Sector / activity" value={draft.sector} onChange={(v) => set("sector", v)} /><Field label="Business address" value={draft.businessAddress} onChange={(v) => set("businessAddress", v)} /><Field label="Residential address" value={draft.residentialAddress} onChange={(v) => set("residentialAddress", v)} /><Field type="number" label="Months operating" value={draft.operatingMonths} onChange={(v) => set("operatingMonths", Number(v))} /><Field type="number" label="Business assets (TZS)" value={draft.businessAssets} onChange={(v) => set("businessAssets", Number(v))} /><Field type="number" label="Inventory value (TZS)" value={draft.inventoryValue} onChange={(v) => set("inventoryValue", Number(v))} /><Field type="number" label="Receivables (TZS)" value={draft.receivables} onChange={(v) => set("receivables", Number(v))} /><Field type="number" label="Payables (TZS)" value={draft.payables} onChange={(v) => set("payables", Number(v))} />{tflReviewer&&<Field label="Assigned TFL officer" value={draft.assignedOfficer} onChange={(v) => set("assignedOfficer", v)} />}</FormGrid></Panel>
        <Panel title="3. Consent, training & monitoring">{tflReviewer&&<><TextArea label="Verification / monitoring notes" value={draft.verificationNotes || ""} onChange={(v) => set("verificationNotes", v)} /><FormGrid><SelectField label="Training status" value={draft.trainingStatus} onChange={(v) => set("trainingStatus", v)} options={["Not started", "In progress", "Completed"]} /><Field type="number" label="TFL monitoring score /100" value={draft.monitoringScore} onChange={(v) => set("monitoringScore", Math.min(100, Number(v)))} /></FormGrid></>}<label className="consent"><input type="checkbox" checked={Boolean(draft.consentAt)} onChange={(e) => set("consentAt", e.target.checked ? new Date().toISOString() : "")} /><span><b>Customer consent</b><small>I approve collection and use of my business information for TijaPass statements, credit scoring and permissioned finance review. Consent scope and time are recorded.</small></span></label></Panel>
        <div className="button-row"><button className="primary" onClick={save}><FileCheck2 size={17} />Save profile</button>{tflReviewer&&<button className="secondary" onClick={verify}><BadgeCheck size={17} />TFL verify profile</button>}</div>
      </div>
      <div className="sticky-column"><Panel title="Onboarding readiness"><div className="big-progress"><span style={{ width: `${completeness}%` }} /></div><h2>{completeness}%</h2><Checklist items={[`${draft.profilePhoto ? "✓" : "○"} Customer photograph`, `${draft.idDocument ? "✓" : "○"} ID evidence`, `${draft.nida ? "✓" : "○"} NIDA number`, `${draft.phone ? "✓" : "○"} Mobile number`, `${draft.businessAddress ? "✓" : "○"} Business location`, `${draft.consentAt ? "✓" : "○"} Consent recorded`, `${draft.trainingStatus === "Completed" ? "✓" : "○"} Training completed`]} /></Panel><Panel title="Verification principle"><Callout icon={ShieldCheck}>Self-declared data is captured first, then corroborated using identity evidence, linked transaction channels, supplier records and TFL field monitoring. Only reliable records feed credit decisions.</Callout></Panel></div>
    </div>
  </section>;
}

function Passport({ data, customer, setCustomerId }) {
  const profile = creditProfile(data, customer.id);
  const journal=(data.accountingJournal||[]).filter(j=>j.customerId===customer.id && !j.reversed);
  const report=accountingReport(customer,journal);
  const fs={revenue:report.revenue,operatingProfit:report.profit,cash:report.cash,totalAssets:report.assets,loanOutstanding:profile.totalOutstanding,coverage:profile.coverage,sourceCounts:journal.reduce((a,j)=>(a[j.source||'Journal']=(a[j.source||'Journal']||0)+1,a),{}),verifiedRecords:profile.reviewedTransactions,totalRecords:journal.length};
  const due = duePosition(data, customer.id);
  return <section><SectionTitle title="Digital credit passport" text="One V9 qualification score (0–100) from TFL-reviewed accounting, identity, business history and previous loan performance. External debts affect affordability, even while awaiting verification." /><div className="selector-strip"><CompactSelect value={customer.id} onChange={setCustomerId} options={data.customers.map((c) => [c.id, `${c.passportId} • ${c.businessName}`])} /><span className="status green"><ShieldCheck size={13} />{customer.status}</span></div>
    <div className="passport-grid"><Panel className="score-panel" title="Loan qualification /100"><ScoreDial score={profile.score} band={profile.band} /><DataRow label="Illustrative product ceiling" value={money(profile.limit)} /><DataRow label="Data coverage" value={`${fs.coverage}%`} /><DataRow label="KYC completeness" value={`${profile.kyc}%`} /><small className="muted">V9 score 0–100 is based only on reviewed accounting evidence. Limits require product-specific terms and lender approval; figures are demonstration data.</small></Panel>
      <Panel title="Customer identity"><DataRow label="Passport ID" value={customer.passportId} /><DataRow label="Business" value={customer.businessName} /><DataRow label="Owner" value={customer.owner} /><DataRow label="Mobile" value={customer.phone} /><DataRow label="NIDA" value={customer.nida} /><DataRow label="Business location" value={customer.businessAddress} /><DataRow label="TFL officer" value={customer.assignedOfficer} /><DataRow label="Training" value={customer.trainingStatus} /></Panel>
      <Panel title="Credit signals">{profile.factors.map(([l, v]) => <Signal key={l} label={l} value={v} />)}</Panel>
    </div>
    <div className="grid-3"><Panel title="Financial evidence"><DataRow label="Journal revenue (management)" value={money(fs.revenue)} /><DataRow label="Journal profit (management)" value={money(fs.operatingProfit)} /><DataRow label="Wallet cash" value={money(fs.cash)} /><DataRow label="Total assets" value={money(fs.totalAssets)} /><DataRow label="Total declared + platform debt" value={money(profile.totalOutstanding)} /></Panel><Panel title="Repayment evidence"><DataRow label="Amount due today" value={money(due.due)} /><DataRow label="Overdue" value={money(due.overdue)} /><DataRow label="Next due" value={due.nextDue?.dueDate || "None"} /><DataRow label="Repayment signal" value={profile.repaymentScore===null?"First-time borrower":`${profile.repaymentScore}/100`} /></Panel><Panel title="Data provenance">{Object.entries(fs.sourceCounts).map(([source, count]) => <DataRow key={source} label={source} value={`${count} records`} />)}<DataRow label="TFL-reviewed / posted entries" value={`${fs.verifiedRecords}/${fs.totalRecords}`} /></Panel></div>
  </section>;
}

function Transactions({ data, role, customer, mutate, postTransfer, audit, notify }) {
  const [kind, setKind] = useState("Income");
  const [amount, setAmount] = useState(250000);
  const [category, setCategory] = useState("Sales");
  const [counterparty, setCounterparty] = useState("");
  const [source, setSource] = useState("TijaPass wallet");
  const [reference, setReference] = useState("");
  const wallet = data.wallets.find((w) => w.id === customer.walletId);
  const rows = data.ledger.filter((tx) => tx.customerId === customer.id || tx.fromWalletId === customer.walletId || tx.toWalletId === customer.walletId).slice(0, 30);
  const add = () => {
    const isExpense = kind === "Expense" || EXPENSE_CATEGORIES.has(category);
    try {
      mutate((next) => {
        const affectsTijaPassWallet = source === "TijaPass wallet";
        postTransfer(next, {
          fromWalletId: affectsTijaPassWallet && isExpense ? customer.walletId : null,
          toWalletId: affectsTijaPassWallet && !isExpense ? customer.walletId : null,
          amount, category, direction: isExpense ? "Expense" : "Income", source, customerId: customer.id,
          counterparty: counterparty || (isExpense ? "Business counterparty" : "Customer sales"), reference,
          verified: source === "TijaPass wallet", status: source === "TijaPass wallet" ? "Completed" : "Pending verification",
          note: source === "Manual entry" ? "Manual record awaiting TFL verification" : affectsTijaPassWallet ? "Business transaction settled through TijaPass wallet" : "Imported external business transaction; does not change internal wallet balance"
        });
        audit(next, role, `Recorded ${kind.toLowerCase()} transaction`, customer.id);
      });
      notify(source !== "TijaPass wallet" ? "Transaction saved pending TFL verification." : "Business transaction posted to the ledger.");
      setReference("");
    } catch (e) { notify(e.message, "error"); }
  };
  const verify = (txId) => {
    mutate((next) => {
      const tx = next.ledger.find((t) => t.id === txId);
      tx.verified = true; tx.status = "Completed";
      audit(next, "TFL Officer", "Verified manual business transaction", txId);
    });
    notify("Transaction verified and now included in statements/scoring.");
  };
  return <section><SectionTitle title={role === "TFL Admin" ? "Business data quality & transaction ledger" : "Business transactions"} text="Entries from a selected source are not automatically bank-verified. Use Smart Accounting to import transaction files and review debit/credit allocations. This older ledger is kept for V4 workflow demonstrations." />
    <div className="grid-2"><Panel title="Record business activity"><div className="segmented"><button className={kind === "Income" ? "active" : ""} onClick={() => { setKind("Income"); setCategory("Sales"); }}>Income</button><button className={kind === "Expense" ? "active" : ""} onClick={() => { setKind("Expense"); setCategory("Inventory / stock"); }}>Expense</button></div><FormGrid><Field type="number" label="Amount (TZS)" value={amount} onChange={(v) => setAmount(Number(v))} /><SelectField label="Category" value={category} onChange={setCategory} options={TX_CATEGORIES} /><Field label="Counterparty / payer" value={counterparty} onChange={setCounterparty} /><SelectField label="Source" value={source} onChange={setSource} options={["TijaPass wallet", "Linked bank", "Linked mobile money", "Manual entry"]} /><Field label="Reference / receipt" value={reference} onChange={setReference} /></FormGrid><DataRow label="Current wallet balance" value={money(wallet?.balance)} /><button className="primary wide" onClick={add}><Plus size={17} />Post transaction</button></Panel>
      <Panel title="Reliability rules"><ControlLine icon={WalletCards} title="TijaPass wallet" text="Automatically traceable internal ledger movement." /><ControlLine icon={Landmark} title="Linked bank" text="Selecting bank as a source does not confirm an API link. Customer-entered entries remain pending review." /><ControlLine icon={Smartphone} title="Linked mobile money" text="Selecting mobile money as a source is not provider authentication. Customer-entered entries remain pending review." /><ControlLine icon={FileCheck2} title="Manual / cash" text="Excluded from finance calculations until supporting evidence is verified by TFL." /></Panel></div>
    <Panel title="Customer ledger"><Table headers={["Date", "Category", "Amount", "Source", "Status", "Reference", "Action"]} rows={rows.map((tx) => [tx.date, tx.category, money(tx.amount), tx.source, <Status key={tx.id} value={tx.status} />, tx.reference, role === "TFL Admin" && tx.status === "Pending verification" ? <button key={`v-${tx.id}`} className="mini-action" onClick={() => verify(tx.id)}>Verify</button> : "—"])} /></Panel>
  </section>;
}

function Finance({ language, data, role, customer, fi, mutate, postTransfer, audit, addNotification, notify }) {
  if (role === "Customer") return <CustomerFinance {...{ language, data, customer, mutate, audit, addNotification, notify }} />;
  if (role === "Financial Institution") return <FIFinance {...{ language, data, fi, mutate, postTransfer, audit, addNotification, notify }} />;
  return <TFLFinance {...{ language, data, mutate, postTransfer, audit, addNotification, notify }} />;
}

function CustomerFinance({ language, data, customer, mutate, audit, addNotification, notify }) {
  const profile = creditProfile(data, customer.id);
  const activeProducts = data.products.filter((p) => p.status === "Active");
  const [productId, setProductId] = useState(activeProducts[0]?.id || "");
  const product = data.products.find((p) => p.id === productId) || activeProducts[0];
  const [amount, setAmount] = useState(Math.min(profile.limit || 1000000, 2000000));
  const [supplierId, setSupplierId] = useState(customer.preferredSupplierId || data.suppliers[0]?.id);
  const [purpose, setPurpose] = useState("Productive business asset / stock");
  const [route, setRoute] = useState("Supplier");
  const freq=product?.repaymentFrequency||'Monthly';
  const count=product?.installmentCount||product?.tenorMonths||6;
  const terms=product?{amount,annualRate:product.annualRate,processingFeePct:product.processingFeePct,fixedFee:product.fixedFee,frequency:freq,count,firstDueDate: freq==='Monthly'?addMonths(todayISO(),1):todayISO(),minAmount:product.minAmount,maxAmount:product.maxAmount}:null;
  const policy=terms?offerPolicyV9(data,customer.id,terms):null;
  const quote=policy?.quote;
  const productLimit=product?maxAffordablePrincipalV9(data,customer.id,terms):0;
  const loans = data.loans.filter((l) => l.customerId === customer.id).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const submit = () => {
    if (!product) return notify("Select a financing product.", "error");
    if (!policy?.allowed || amount>productLimit) return notify((policy?.reasons||[]).slice(0,2).join(" ") || "Amount exceeds verified capacity for this product.", "error");
    if (route === "Customer" && !product.customerDisbursementException) return notify("This product does not allow customer-wallet disbursement.", "error");
    mutate((next) => {
      const lender = next.financialInstitutions.find((f) => f.id === product.fiId);
      const loanId = uid("LN");
      next.loans.unshift({ id: loanId, customerId: customer.id, fiId: product.fiId, productId: product.id, supplierId, purpose, requestedAmount: amount, approvedAmount: 0, annualRate: 0, processingFee: 0, tenorMonths: 0, totalInterest: 0, totalRepayment: 0, outstanding: 0, status: "Submitted", disbursementRoute: route, standingOrder: true, repaymentFrequency: freq, installmentCount: count, requestedTerms: terms, qualificationAtRequest: {score:profile.score,coverage:profile.coverage,reviewedTransactions:profile.reviewedTransactions,existingMonthlyDebt:profile.existingMonthlyDebt,availableMonthly:profile.availableMonthly}, collectionService: false, createdAt: todayISO(), schedule: [], quoteId: null, invoiceId: null, exceptionApproved: false });
      audit(next, customer.businessName, "Submitted finance request", loanId);
      addNotification(next, { role: "Financial Institution", entityId: lender.id, title: "New finance request", body: `${customer.businessName} requested ${money(amount)} under ${product.name}.` });
      addNotification(next, { role: "TFL Admin", entityId: "FI-TFL", title: "Customer finance request submitted", body: `${customer.businessName} submitted ${money(amount)} to ${lender.name}.` });
    });
    notify("Finance request submitted.");
  };
  const accept = (loanId) => {
    mutate((next) => {
      const loan = next.loans.find((l) => l.id === loanId);
      loan.status = "Accepted"; loan.acceptedAt = todayISO();
      audit(next, customer.businessName, "Accepted finance offer", loanId);
      addNotification(next, { role: "Financial Institution", entityId: loan.fiId, severity: "success", title: "Offer accepted", body: `${customer.businessName} accepted offer ${loan.id}.` });
      addNotification(next, { role: "Supplier", entityId: loan.supplierId, title: "Prepare quotation / invoice", body: `Finance request ${loan.id} has been accepted. Complete supplier documentation.` });
    });
    notify("Offer accepted. Supplier documentation can proceed.");
  };
  const decline = (loanId) => {mutate(next=>{const l=next.loans.find(x=>x.id===loanId);if(l?.status!=="Offered")return;l.status="Declined";l.declinedAt=todayISO();audit(next,customer.businessName,"Declined financing offer",loanId);addNotification(next,{role:"Financial Institution",entityId:l.fiId,title:"Offer declined",body:`${customer.businessName} declined ${loanId}.`});});notify("Offer declined; no loan disbursed.");};
  return <section><SectionTitle title="Finance" text="Unified V9 score, lender-specific affordability, debt declarations, offer, repayment progress and full schedules. Demo only; no actual approval." />
    <div className="finance-hero"><div><span>Indicative product ceiling</span><strong>{money(profile.limit)}</strong><small>Qualification {profile.score}/100 • {profile.band} • Reviewed entries {profile.reviewedTransactions}</small></div><div><ShieldCheck size={24} /><p>Actual approval, pricing and amount are determined by the selected financial institution.</p></div></div>
    <div className="v9-policy-panel"><strong>Unified qualification: {profile.score}/100 • {profile.band}</strong><p>Reviewed entries {profile.reviewedTransactions} • reliable coverage {profile.coverage}% • evidenced months {profile.months} • repayment share {profile.repaymentShare}%.</p><p>Available monthly debt service {money(profile.availableMonthly)} after existing instalments of {money(profile.existingMonthlyDebt)}. Product-specific maximum {money(productLimit)}.</p>{profile.reasons.length>0&&<ul>{profile.reasons.slice(0,5).map((r,i)=><li key={i}>{r}</li>)}</ul>}<small>Only TFL-reviewed V7 journals support this assessment. No loan approval or real money is implied.</small></div>
    <div className="grid-2"><Panel title="New finance request"><FormGrid><SelectField label="Finance product" value={productId} onChange={setProductId} options={activeProducts.map((p) => ({ value: p.id, label: `${data.financialInstitutions.find((f) => f.id === p.fiId)?.name} • ${p.name}` }))} /><Field type="number" label="Requested amount (TZS)" value={amount} onChange={(v) => setAmount(Number(v))} /><SelectField label="Supplier" value={supplierId} onChange={setSupplierId} options={data.suppliers.map((s) => ({ value: s.id, label: s.name }))} /><SelectField label="Disbursement route" value={route} onChange={setRoute} options={["Supplier", "Customer"]} /><Field label="Purpose" value={purpose} onChange={setPurpose} /></FormGrid>{route === "Customer" && <Callout icon={AlertTriangle}>Customer-wallet disbursement is exceptional. It only proceeds when the selected product permits it and TFL records an approved exception.</Callout>}<button className="primary wide" disabled={!policy?.allowed} onClick={submit}><Send size={17} />Submit request</button></Panel>
      <Panel title="Illustrative cost before request">{quote && <><DataRow label="Principal / asset amount" value={money(quote.principal)} /><DataRow label="Annual interest rate" value={pct(quote.annualRate)} /><DataRow label="Total interest" value={money(quote.totalInterest)} /><DataRow label="Processing fee" value={money(quote.processingFee)} /><DataRow label="Repayment frequency / count" value={`${freq} × ${count}`} /><DataRow label="First installment" value={money(quote.installment)} /><DataRow label="Total repayment" value={money(quote.totalRepayment)} /><small className="muted">Reducing-balance repayments using the chosen product’s repayment cycle. The lender may revise the offer subject to a fresh affordability check.</small></>}</Panel></div>
    <Panel title="My finance applications"><Table headers={["ID", "Lender", "Requested", "Rate", "Total repayment", "Status", "Next action"]} rows={loans.map((l) => { const lender = data.financialInstitutions.find((f) => f.id === l.fiId); return [l.id, lender?.name, money(l.requestedAmount), l.annualRate ? pct(l.annualRate) : "Pending offer", l.totalRepayment ? money(l.totalRepayment) : "—", <Status key={l.id} value={l.status} />, l.status === "Offered" ? <span key={`a-${l.id}`} className="button-row"><button className="mini-action" onClick={() => accept(l.id)}>Accept</button><button className="mini-action" onClick={() => decline(l.id)}>Decline</button></span> : nextActionForLoan(l)]; })} /></Panel>
    <LoanTrackerV9 data={data} customer={customer} language={language} />
    <LoanRegistryV9 data={data} customer={customer} role="Customer" language={language} mutate={mutate} audit={audit} notify={notify} addNotification={addNotification} />
    {loans.filter((l) => l.schedule?.length).map((loan) => <Panel key={loan.id} title={`Repayment schedule • ${loan.id}`}><LoanSummary data={data} loan={loan} /><Table headers={["#", "Due date", "Principal", "Interest", "Fee", "Amount due", "Paid", "Status"]} rows={loan.schedule.map((r) => [r.no, r.dueDate, money(r.principal), money(r.interest), money(r.fee), money(r.amountDue), money(r.paid), <Status key={r.no} value={r.status} />])} /></Panel>)}
  </section>;
}

function FIFinance({ language, data, fi, mutate, postTransfer, audit, addNotification, notify }) {
  const loans = data.loans.filter((l) => l.fiId === fi.id).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const [selectedLoanId, setSelectedLoanId] = useState(loans[0]?.id || "");
  useEffect(() => { if (loans.length && !loans.some((l) => l.id === selectedLoanId)) setSelectedLoanId(loans[0].id); }, [fi.id, data.loans.length]);
  const loan = data.loans.find((l) => l.id === selectedLoanId);
  const customer = loan ? data.customers.find((c) => c.id === loan.customerId) : null;
  const product = loan ? data.products.find((p) => p.id === loan.productId) : null;
  const wallet = data.wallets.find((w) => w.id === fi.walletId);
  const access = loan ? data.accessGrants.find((a) => a.fiId === fi.id && a.customerId === loan.customerId && a.status === "Active") : null;
  const [reviewNote,setReviewNote]=useState('');
  const markReview=()=>{if(!loan||(!access&&!fi.isTFL))return notify('Unlock consented customer review first.','error');if(loan.status!=='Submitted')return;mutate(next=>{const l=next.loans.find(x=>x.id===loan.id);l.status='Under review';audit(next,fi.name,'Began credit assessment',l.id);addNotification(next,{role:'Customer',entityId:l.customerId,title:'Loan being reviewed',body:`${fi.name} is reviewing ${l.id}.`});});notify('Application now under review.');};
  const rejectApplication=()=>{if(!loan||(!access&&!fi.isTFL))return notify('Unlock customer review first.','error');if(!['Submitted','Under review'].includes(loan.status))return;if(reviewNote.trim().length<10)return notify('Enter at least 10 characters explaining the reason.','error');mutate(next=>{const l=next.loans.find(x=>x.id===loan.id);l.status='Rejected';l.rejectionReason=reviewNote.trim();l.rejectedAt=todayISO();audit(next,fi.name,'Rejected finance application: '+reviewNote,l.id);addNotification(next,{role:'Customer',entityId:l.customerId,severity:'warning',title:'Loan application not approved',body:`${fi.name}: ${reviewNote}`});});setReviewNote('');notify('Decision recorded and customer notified.');};
  const [rate, setRate] = useState(product?.annualRate || 18);
  const [feePct, setFeePct] = useState(product?.processingFeePct || 2);
  const [tenor, setTenor] = useState(product?.installmentCount || product?.tenorMonths || 6);
  useEffect(() => { setRate(product?.annualRate || 18); setFeePct(product?.processingFeePct || 2); setTenor(product?.installmentCount || product?.tenorMonths || 6); }, [loan?.id]);
  const unlock = () => {
    if (!loan || !customer) return;
    if (access || fi.isTFL) return notify("Customer access is already available.");
    try {
      mutate((next) => {
        postTransfer(next, { fromWalletId: fi.walletId, toWalletId: "W-TFL", amount: next.settings.viewFee, category: "TFL access fee", source: "TijaPass wallet", customerId: customer.id, counterparty: "Tracell Finance Limited", reference: `${fi.id}-${customer.id}-VIEW`, note: "Compulsory permissioned customer information-view fee" });
        next.accessGrants.push({ id: uid("ACCESS"), fiId: fi.id, customerId: customer.id, status: "Active", paidFee: next.settings.viewFee, grantedAt: todayISO(), expiresAt: addMonths(todayISO(), 3) });
        audit(next, fi.name, "Paid information-view fee and unlocked customer profile", customer.id);
      });
      notify("View fee paid and customer profile unlocked.");
    } catch (e) { notify(e.message, "error"); }
  };
  const makeOffer = () => {
    if (!loan || !customer) return;
    if (!access && !fi.isTFL) return notify("Pay the compulsory information-view fee before making an offer.", "error");
    const frequency=loan.repaymentFrequency||product?.repaymentFrequency||'Monthly';
    const terms={amount:loan.requestedAmount,annualRate:rate,processingFeePct:feePct,fixedFee:product?.fixedFee||0,frequency,count:tenor,firstDueDate:frequency==='Monthly'?addMonths(todayISO(),1):todayISO(),maxAmount:product?.maxAmount,minAmount:product?.minAmount};
    const decision=offerPolicyV9(data,customer.id,terms);
    if(!decision.allowed)return notify('Offer blocked: '+decision.reasons.slice(0,2).join(' '),'error');
    const offer=decision.quote;
    mutate((next) => {
      const target = next.loans.find((l) => l.id === loan.id);
      Object.assign(target, { approvedAmount: loan.requestedAmount, annualRate: rate, processingFee: offer.processingFee, tenorMonths: frequency==='Monthly'?tenor:0, installmentCount:tenor, repaymentFrequency:frequency, qualificationAtOffer:{score:decision.assessment.score,availableMonthly:decision.assessment.availableMonthly,existingMonthlyDebt:decision.assessment.existingMonthlyDebt}, totalInterest: offer.totalInterest, totalRepayment: offer.totalRepayment, outstanding: offer.principal, status: "Offered", schedule: offer.schedule, offeredAt: todayISO() });
      audit(next, fi.name, "Created transparent finance offer", loan.id);
      addNotification(next, { role: "Customer", entityId: customer.id, title: "Finance offer received", body: `${fi.name} offered ${money(loan.requestedAmount)} at ${pct(rate)} p.a. Open Finance to review fees and repayment schedule.` });
    });
    notify("Offer created and sent to customer.");
  };
  const disburse = () => {
    if (!loan || !customer) return;
    if (!["Accepted", "Ready to disburse"].includes(loan.status)) return notify("Customer must accept the offer before disbursement.", "error");
    const supplier = data.suppliers.find((s) => s.id === loan.supplierId);
    const invoice = data.invoices.find((i) => i.id === loan.invoiceId || (i.customerId === loan.customerId && i.supplierId === loan.supplierId && i.status !== "Cancelled"));
    if (loan.disbursementRoute === "Supplier" && !invoice) return notify("Supplier invoice is required before supplier-direct disbursement.", "error");
    if (loan.disbursementRoute === "Customer" && !loan.exceptionApproved) return notify("TFL must approve the exceptional customer-wallet route before disbursement.", "error");
    const decision=offerPolicyV9(data,customer.id,{amount:Number(loan.approvedAmount||loan.requestedAmount),annualRate:loan.annualRate,processingFeePct:loan.processingFee?0:product?.processingFeePct||0,fixedFee:loan.processingFee||0,frequency:loan.repaymentFrequency||product?.repaymentFrequency||'Monthly',count:loan.installmentCount||loan.tenorMonths||product?.tenorMonths||6,firstDueDate:loan.schedule?.[0]?.dueDate||addMonths(todayISO(),1),minAmount:product?.minAmount,maxAmount:product?.maxAmount});
    // The quoted installment schedule is the binding offer; recheck *that* schedule against current affordability.
    if(!decision.assessment.eligibleData || (loan.schedule||[]).some(r=>r.amountDue>monthlyToCadence(decision.assessment.availableMonthly,loan.repaymentFrequency||'Monthly')+1))return notify('Disbursement held: customer qualification, accounting evidence, existing debt or repayment capacity has changed. Reassess offer.', 'error');
    const principal = Number(loan.approvedAmount || loan.requestedAmount);
    const tflFee = fi.isTFL ? 0 : Math.round(principal * data.settings.disbursementFeePct / 100);
    if ((wallet?.balance || 0) < principal + tflFee) return notify(`Funding wallet needs at least ${money(principal + tflFee)}.`, "error");
    try {
      mutate((next) => {
        const target = next.loans.find((l) => l.id === loan.id);
        const destination = loan.disbursementRoute === "Customer" ? customer.walletId : supplier.walletId;
        postTransfer(next, { fromWalletId: fi.walletId, toWalletId: destination, amount: principal, category: "Loan disbursement", source: "TijaPass wallet", customerId: customer.id, loanId: loan.id, counterparty: loan.disbursementRoute === "Customer" ? customer.businessName : supplier.name, reference: invoice?.id || loan.id, note: `${loan.disbursementRoute}-route finance disbursement` });
        if (tflFee > 0) postTransfer(next, { fromWalletId: fi.walletId, toWalletId: "W-TFL", amount: tflFee, category: "TFL disbursement fee", source: "TijaPass wallet", customerId: customer.id, loanId: loan.id, counterparty: "Tracell Finance Limited", reference: `${loan.id}-TFL-FEE`, note: "TFL percentage fee on successful disbursement" });
        target.status = "Active"; target.disbursedAt = todayISO(); target.outstanding = principal;
        if (invoice) { const inv = next.invoices.find((i) => i.id === invoice.id); inv.status = "Paid"; target.invoiceId = inv.id; }
        audit(next, fi.name, "Disbursed finance", loan.id);
        addNotification(next, { role: "Customer", entityId: customer.id, severity: "success", title: "Finance disbursed", body: `${money(principal)} was disbursed via the approved ${loan.disbursementRoute.toLowerCase()} route. Standing repayment instruction is active.` });
        if (supplier) addNotification(next, { role: "Supplier", entityId: supplier.id, severity: "success", title: "Finance payment received", body: `${money(principal)} was credited for ${customer.businessName}. Complete delivery confirmation after handover.` });
      });
      notify("Finance disbursed and transaction ledger updated.");
    } catch (e) { notify(e.message, "error"); }
  };
  return <section><SectionTitle title={`${fi.name} finance decisions`} text="Customer access is permissioned and billable. The institution sets pricing, sends the offer, maintains sufficient wallet funds and executes the approved disbursement route." />
    <div className="selector-strip"><b>Application</b><CompactSelect value={selectedLoanId} onChange={setSelectedLoanId} options={loans.map((l) => [l.id, `${l.id} • ${data.customers.find((c) => c.id === l.customerId)?.businessName} • ${l.status}`])} /><span className="status blue">Funding wallet {money(wallet?.balance)}</span></div>
    {!loan ? <Empty title="No applications for this institution" /> : <>
      <div className="grid-3"><Panel title="Application"><DataRow label="Customer" value={customer.businessName} /><DataRow label="Requested" value={money(loan.requestedAmount)} /><DataRow label="Purpose" value={loan.purpose} /><DataRow label="Route" value={loan.disbursementRoute} /><DataRow label="Status" value={loan.status} /><DataRow label="Next action" value={nextActionForLoan(loan)} /></Panel>
      <Panel title="Permissioned customer access"><DataRow label="Access status" value={fi.isTFL ? "TFL operator access" : access ? "Unlocked" : "Locked"} /><DataRow label="Information-view fee" value={fi.isTFL ? "Exempt" : money(data.settings.viewFee)} />{!access && !fi.isTFL && <button className="primary wide" onClick={unlock}><LockKeyhole size={17} />Pay fee & unlock</button>}{(access || fi.isTFL) && <><DataRow label="Loan qualification /100" value={creditProfile(data, customer.id).score} /><DataRow label="Indicative limit" value={money(creditProfile(data, customer.id).limit)} /><DataRow label="Reviewed transaction count" value={creditProfile(data, customer.id).reviewedTransactions} /><DataRow label="All declared debt" value={money(creditProfile(data, customer.id).totalOutstanding)} /><DataRow label="Existing monthly instalments" value={money(creditProfile(data, customer.id).existingMonthlyDebt)} /></>}</Panel>
      <Panel title="Funding controls"><DataRow label="Wallet balance" value={money(wallet?.balance)} /><DataRow label="Principal required" value={money(loan.approvedAmount || loan.requestedAmount)} /><DataRow label="TFL disbursement fee" value={fi.isTFL ? "Internal / exempt" : pct(data.settings.disbursementFeePct)} /><DataRow label="Total declared debt" value={money(creditProfile(data,customer.id).totalOutstanding)} /><DataRow label="Supplier documentation" value={loan.invoiceId || data.invoices.find((i) => i.customerId === loan.customerId && i.supplierId === loan.supplierId)?.id || "Pending"} /></Panel></div>
      {(access||fi.isTFL)&&<LoanTrackerV9 data={data} customer={customer} fiId={fi.id} language={language} />}
      <div className="grid-2"><Panel title="Price and make offer"><FormGrid><Field type="number" label="Annual interest rate (%)" value={rate} onChange={(v) => setRate(Number(v))} /><Field type="number" label="Processing fee (%)" value={feePct} onChange={(v) => setFeePct(Number(v))} /><Field type="number" label={`Number of ${loan.repaymentFrequency||'Monthly'} instalments`} value={tenor} onChange={(v) => setTenor(Number(v))} /></FormGrid>{(() => { const d=offerPolicyV9(data,customer.id,{amount:loan.requestedAmount,annualRate:rate,processingFeePct:feePct,fixedFee:product?.fixedFee||0,frequency:loan.repaymentFrequency||'Monthly',count:tenor,firstDueDate:addMonths(todayISO(),1),minAmount:product?.minAmount,maxAmount:product?.maxAmount}); const q=d.quote||{totalInterest:0,processingFee:0,totalRepayment:0,installment:0}; return <div className="quote-summary"><DataRow label="Offer policy" value={d.allowed?'Within assessed limits':d.reasons.slice(0,2).join(' | ')} /><DataRow label="Interest amount" value={money(q.totalInterest)} /><DataRow label="Processing fee" value={money(q.processingFee)} /><DataRow label="Total repayment" value={money(q.totalRepayment)} /><DataRow label="First installment" value={money(q.installment)} /></div>; })()}<button className="primary wide" disabled={!['Submitted','Under review'].includes(loan.status)} onClick={makeOffer}><Send size={17} />Create & send offer</button><div className="v9-loan-actions"><button className="secondary" disabled={loan.status!=='Submitted'} onClick={markReview}>Mark under review</button></div><label className="v9-review-label">Reason if not approved<textarea rows={2} value={reviewNote} onChange={e=>setReviewNote(e.target.value)} placeholder="State clear, factual rejection reason" /></label><button className="secondary" disabled={!['Submitted','Under review'].includes(loan.status)} onClick={rejectApplication}>Reject with explanation</button></Panel>
      <Panel title="Disbursement"><Callout icon={ShieldCheck}>Normal route: FI wallet → verified supplier wallet. Customer-wallet payment is exceptional and requires a recorded TFL approval plus product permission.</Callout><DataRow label="Customer acceptance" value={loan.acceptedAt || (loan.status === "Accepted" ? "Accepted" : "Pending")} /><DataRow label="Exception approval" value={loan.disbursementRoute === "Customer" ? (loan.exceptionApproved ? "Approved" : "Required") : "Not required"} /><button className="primary wide" disabled={!['Accepted','Ready to disburse'].includes(loan.status)} onClick={disburse}><ArrowUpRight size={17} />Disburse approved finance</button></Panel></div>
    </>}
  </section>;
}

function TFLFinance({ language, data, mutate, postTransfer, audit, addNotification, notify }) {
  const [customerId, setCustomerId] = useState(data.customers[0]?.id);
  const customer = data.customers.find((c) => c.id === customerId);
  const customerLoans = data.loans.filter((l) => l.customerId === customerId);
  const approveException = (loanId) => {
    mutate((next) => {
      const loan = next.loans.find((l) => l.id === loanId);
      loan.exceptionApproved = true;
      audit(next, "TFL Admin", "Approved exceptional customer-wallet disbursement route", loanId);
      addNotification(next, { role: "Financial Institution", entityId: loan.fiId, title: "Disbursement exception approved", body: `TFL approved customer-wallet route for ${loan.id}.` });
    });
    notify("Exceptional disbursement route approved and audited.");
  };
  const runStandingOrders = () => {
    let collected = 0; let count = 0;
    mutate((next) => {
      next.loans.filter((l) => ["Active", "Overdue"].includes(l.status) && l.standingOrder).forEach((loan) => {
        const cust = next.customers.find((c) => c.id === loan.customerId);
        const lender = next.financialInstitutions.find((f) => f.id === loan.fiId);
        const wallet = next.wallets.find((w) => w.id === cust.walletId);
        const dueRows = (loan.schedule || []).filter((r) => r.status !== "Paid" && r.dueDate <= todayISO());
        dueRows.forEach((row) => {
          const due = Math.max(0, row.amountDue - row.paid);
          const pay = Math.min(due, wallet.balance);
          if (pay <= 0) { row.status = "Overdue"; loan.status = "Overdue"; return; }
          postTransfer(next, { fromWalletId: cust.walletId, toWalletId: lender.walletId, amount: pay, category: "Loan repayment", source: "TijaPass wallet", customerId: cust.id, loanId: loan.id, counterparty: lender.name, reference: `${loan.id}-AUTO-${row.no}`, note: "Standing instruction repayment" });
          const principalDelta = principalPaidDelta(row, pay);
          row.paid += pay; row.status = row.paid >= row.amountDue ? "Paid" : "Overdue";
          if(row.status==="Paid")row.paidAt=todayISO();
          loan.outstanding = Math.max(0, loan.outstanding - principalDelta);
          collected += pay; count += 1;
          if (loan.collectionService && !lender.isTFL) {
            const fee = Math.round(pay * next.settings.collectionFeePct / 100);
            const lenderWallet = next.wallets.find((w) => w.id === lender.walletId);
            if (fee > 0 && lenderWallet.balance >= fee) postTransfer(next, { fromWalletId: lender.walletId, toWalletId: "W-TFL", amount: fee, category: "TFL collection fee", source: "TijaPass wallet", customerId: cust.id, loanId: loan.id, counterparty: "Tracell Finance Limited", reference: `${loan.id}-COLL-${row.no}`, note: "Optional collection service fee" });
          }
          addNotification(next, { role: "Customer", entityId: cust.id, severity: row.status === "Paid" ? "success" : "warning", title: "Standing repayment processed", body: `${money(pay)} was applied to ${loan.id}.` });
        });
        if ((loan.schedule || []).every((r) => r.status === "Paid")) { loan.status = "Repaid"; loan.outstanding = 0; }
      });
      audit(next, "TFL Collections Engine", `Ran standing-order controls: ${count} payment(s)`, "ALL-ACTIVE-LOANS");
    });
    notify(count ? `${count} payment(s) processed totaling ${money(collected)}.` : "No due standing-order payments were collectible today.");
  };
  return <section><SectionTitle title="TFL finance operations" text="TFL reviews all loan requests and external loan declarations, governs exceptions and repayment collections. Changes to external loans require a reason and preserve audit revisions." />
    <div className="grid-3"><Panel title="Customer"><CompactSelect value={customerId} onChange={setCustomerId} options={data.customers.map((c) => [c.id, c.businessName])} /><DataRow label="Loan qualification /100" value={creditProfile(data, customerId).score} /><DataRow label="Current limit" value={money(creditProfile(data, customerId).limit)} /><DataRow label="KYC" value={`${creditProfile(data,customerId).kyc}%`} /><DataRow label="Reviewed records" value={creditProfile(data,customerId).reviewedTransactions} /><DataRow label="All existing debt" value={money(creditProfile(data,customerId).totalOutstanding)} /><DataRow label="Allowed instalment share" value={`${creditProfile(data,customerId).repaymentShare}%`} /></Panel><Panel title="TFL fee engine"><DataRow label="Compulsory FI information view" value={money(data.settings.viewFee)} /><DataRow label="Successful disbursement fee" value={pct(data.settings.disbursementFeePct)} /><DataRow label="Optional collection fee" value={pct(data.settings.collectionFeePct)} /></Panel><Panel title="Repayment controls"><DataRow label="Standing instruction" value="Default on financed facilities" /><DataRow label="Withdrawal treatment" value="Reserve due/overdue amount only" /><button className="primary wide" onClick={runStandingOrders}><RefreshCw size={17} />Run due-date controls</button></Panel></div>
    <Panel title="Customer finance lifecycle"><Table headers={["Loan", "Lender", "Requested", "Route", "Status", "Outstanding", "TFL action"]} rows={customerLoans.map((l) => { const lender = data.financialInstitutions.find((f) => f.id === l.fiId); return [l.id, lender?.name, money(l.requestedAmount), l.disbursementRoute, <Status key={l.id} value={l.status} />, money(l.outstanding), l.disbursementRoute === "Customer" && !l.exceptionApproved ? <button key={`e-${l.id}`} className="mini-action" onClick={() => approveException(l.id)}>Approve exception</button> : nextActionForLoan(l)]; })} /></Panel>
    <LoanTrackerV9 data={data} customer={customer} language={language} />
    <LoanRegistryV9 data={data} customer={customer} role="TFL Admin" language={language} mutate={mutate} audit={audit} notify={notify} addNotification={addNotification} />
  </section>;
}

function Statements({ data, customer, setCustomerId }) {
  const fs = financialStatements(data, customer.id);
  const profile = creditProfile(data, customer.id);
  return <section><SectionTitle title="Financial statements generated from reliable business activity" text="Statements are generated from reliable transaction evidence. The operating statement is transaction-based; business-position fields add monitored inventory, receivables, payables and assets. Unverified manual entries are excluded." /><div className="selector-strip"><CompactSelect value={customer.id} onChange={setCustomerId} options={data.customers.map((c) => [c.id, c.businessName])} /><span className="status green">Reliable coverage {fs.coverage}%</span><span className="status blue">{fs.verifiedRecords} verified records</span></div>
    <div className="grid-3"><Panel title="Management income statement • transaction basis"><DataRow label="Revenue" value={money(fs.revenue)} /><DataRow label="Direct stock/material costs" value={`(${money(fs.cogs)})`} /><DataRow label="Gross profit" value={money(fs.grossProfit)} strong /><DataRow label="Operating expenses" value={`(${money(fs.opex)})`} /><DataRow label="Journal profit (management)" value={money(fs.operatingProfit)} strong /><DataRow label="Operating margin" value={fs.revenue ? pct(fs.operatingProfit / fs.revenue * 100) : "0%"} /></Panel>
      <Panel title="Cash-flow statement"><DataRow label="Operating inflows" value={money(fs.operatingInflows)} /><DataRow label="Operating outflows" value={`(${money(fs.operatingOutflows)})`} /><DataRow label="Net operating cash" value={money(fs.operatingNetCash)} strong /><DataRow label="Finance proceeds" value={money(fs.financingInflows)} /><DataRow label="Loan repayments" value={`(${money(fs.financingOutflows)})`} /><DataRow label="Owner flows" value={money(fs.ownerFlows)} /></Panel>
      <Panel title="Business position"><DataRow label="Wallet cash" value={money(fs.cash)} /><DataRow label="Inventory" value={money(fs.inventory)} /><DataRow label="Receivables" value={money(fs.receivables)} /><DataRow label="Business assets" value={money(fs.assets)} /><DataRow label="Total assets" value={money(fs.totalAssets)} strong /><DataRow label="Payables" value={money(fs.payables)} /><DataRow label="Finance outstanding" value={money(fs.loanOutstanding)} /><DataRow label="Indicative equity" value={money(fs.equity)} strong /></Panel></div>
    <div className="grid-2"><Panel title="Data provenance"><div className="source-list">{Object.entries(fs.sourceCounts).map(([source, count]) => <div key={source}><span><SourceIcon source={source} />{source}</span><b>{count} records</b></div>)}</div><Callout icon={Database}>Pending or unverified manual records are excluded until evidence is checked. This prevents unsupported declarations from inflating statements or credit scoring.</Callout></Panel><Panel title="Credit interpretation"><ScoreDial score={profile.score} band={profile.band} compact /><DataRow label="Indicative limit" value={money(profile.limit)} /><DataRow label="Reviewed accounting coverage" value={`${profile.transactionScore}/100`} /><DataRow label="Repayment performance" value={`${profile.repaymentScore}/100`} /></Panel></div>
  </section>;
}

function Wallet({ data, role, customer, fi, supplier, mutate, postTransfer, audit, addNotification, notify }) {
  const wallet = role === "Customer" ? data.wallets.find((w) => w.id === customer.walletId) : role === "Financial Institution" ? data.wallets.find((w) => w.id === fi.walletId) : role === "Supplier" ? data.wallets.find((w) => w.id === supplier.walletId) : data.wallets.find((w) => w.id === "W-TFL");
  const position = walletAvailable(data, wallet.id);
  const [amount, setAmount] = useState(500000);
  const [channelType, setChannelType] = useState("Mobile Money");
  const [mode, setMode] = useState("Deposit");
  const [targetSupplier, setTargetSupplier] = useState(data.suppliers.find((s) => s.id !== supplier?.id)?.id || data.suppliers[0]?.id);
  const supplierFinanceLoans = role === "Supplier" ? data.loans.filter((l) => l.supplierId === supplier.id && ["Active", "Overdue", "Repaid"].includes(l.status)) : [];
  const [refundLoanId, setRefundLoanId] = useState(supplierFinanceLoans[0]?.id || "");
  const channels = data.channels.filter((c) => c.walletId === wallet.id);
  const rows = data.ledger.filter((t) => t.fromWalletId === wallet.id || t.toWalletId === wallet.id).slice(0, 25);
  const cashMove = () => {
    if (!data.settings.externalRailsLive) {
      // Sandbox ledger movement intentionally remains available for testing the end-to-end workflow.
    }
    try {
      if (mode === "Withdraw" && role === "Customer" && amount > position.available) throw new Error(`Only ${money(position.available)} is currently withdrawable. Due/overdue repayment amounts are reserved, not fully frozen.`);
      mutate((next) => {
        postTransfer(next, { fromWalletId: mode === "Withdraw" ? wallet.id : null, toWalletId: mode === "Deposit" ? wallet.id : null, amount, category: mode === "Deposit" ? "External cash-in" : "External cash-out", source: channelType === "Bank" ? "Linked bank" : "Linked mobile money", customerId: role === "Customer" ? customer.id : null, counterparty: `${channelType} linked channel`, reference: uid("CASH"), note: `${mode} request through linked external rail` });
        audit(next, workspaceName(role, customer, fi, supplier), `${mode} via ${channelType}`, wallet.id);
      });
      notify(`${mode} recorded through the configured ${channelType.toLowerCase()} rail.`);
    } catch (e) { notify(e.message, "error"); }
  };
  const supplierTransfer = () => {
    if (role !== "Supplier") return;
    const target = data.suppliers.find((s) => s.id === targetSupplier);
    if (!target || target.id === supplier.id) return notify("Select another verified supplier.", "error");
    try {
      mutate((next) => {
        postTransfer(next, { fromWalletId: supplier.walletId, toWalletId: target.walletId, amount, category: "Supplier-to-supplier payment", source: "TijaPass wallet", counterparty: target.name, reference: uid("SUPPAY"), note: "Permitted supplier-to-supplier business transfer" });
        audit(next, supplier.name, "Transferred to verified supplier", target.id);
        addNotification(next, { role: "Supplier", entityId: target.id, severity: "success", title: "Supplier payment received", body: `${supplier.name} transferred ${money(amount)} to your wallet.` });
      }); notify("Supplier-to-supplier payment completed.");
    } catch (e) { notify(e.message, "error"); }
  };
  const refundLender = () => {
    if (role !== "Supplier") return;
    const loan = data.loans.find((l) => l.id === refundLoanId && l.supplierId === supplier.id);
    if (!loan) return notify("Select a finance-linked transaction for the refund.", "error");
    const lender = data.financialInstitutions.find((f) => f.id === loan.fiId);
    if (!lender) return notify("Lender record not found.", "error");
    const refundAmount = Math.min(Number(amount) || 0, wallet.balance, Number(loan.approvedAmount || loan.requestedAmount || 0));
    if (refundAmount <= 0) return notify("Enter a valid refund amount.", "error");
    try {
      mutate((next) => {
        postTransfer(next, { fromWalletId: supplier.walletId, toWalletId: lender.walletId, amount: refundAmount, category: "Supplier refund to FI", source: "TijaPass wallet", customerId: loan.customerId, loanId: loan.id, counterparty: lender.name, reference: `${loan.id}-SUP-REFUND`, note: "Finance-linked supplier refund. Facility must be reconciled/recast by lender/TFL." });
        audit(next, supplier.name, "Returned finance-linked funds to lender", loan.id);
        addNotification(next, { role: "Financial Institution", entityId: lender.id, severity: "warning", title: "Supplier refund received", body: `${supplier.name} returned ${money(refundAmount)} against ${loan.id}. Reconcile the facility and repayment schedule.` });
        addNotification(next, { role: "TFL Admin", entityId: "FI-TFL", severity: "warning", title: "Finance-linked supplier refund", body: `${supplier.name} returned funds against ${loan.id}. TFL/FI reconciliation is required.` });
      });
      notify("Finance-linked supplier refund transferred to the lender for reconciliation.");
    } catch (e) { notify(e.message, "error"); }
  };
  const repay = () => {
    if (role !== "Customer") return;
    const loan = data.loans.find((l) => l.customerId === customer.id && ["Active", "Overdue"].includes(l.status));
    if (!loan) return notify("No active facility requires repayment.", "error");
    const lender = data.financialInstitutions.find((f) => f.id === loan.fiId);
    const dueRows = loan.schedule.filter((r) => r.status !== "Paid");
    const row = dueRows[0];
    if (!row) return notify("Repayment schedule is already complete.");
    const pay = Math.min(amount, row.amountDue - row.paid, wallet.balance);
    if (pay <= 0) return notify("Enter a valid repayment amount.", "error");
    mutate((next) => {
      postTransfer(next, { fromWalletId: customer.walletId, toWalletId: lender.walletId, amount: pay, category: "Loan repayment", source: "TijaPass wallet", customerId: customer.id, loanId: loan.id, counterparty: lender.name, reference: `${loan.id}-MANUAL-${row.no}`, note: "Customer initiated loan repayment" });
      const targetLoan = next.loans.find((l) => l.id === loan.id); const targetRow = targetLoan.schedule.find((r) => r.no === row.no);
      const principalReduction = principalPaidDelta(targetRow, pay);
      targetRow.paid += pay; targetRow.status = targetRow.paid >= targetRow.amountDue ? "Paid" : (targetRow.dueDate < todayISO() ? "Overdue" : "Part-paid"); if(targetRow.status==="Paid")targetRow.paidAt=todayISO(); targetLoan.outstanding = Math.max(0, targetLoan.outstanding - principalReduction);
      if (targetLoan.schedule.every((r) => r.status === "Paid")) { targetLoan.status = "Repaid"; targetLoan.outstanding = 0; }
      audit(next, customer.businessName, "Made wallet loan repayment", loan.id);
      addNotification(next, { role: "Financial Institution", entityId: lender.id, severity: "success", title: "Repayment received", body: `${customer.businessName} paid ${money(pay)} toward ${loan.id}.` });
    });
    notify(`${money(pay)} repayment completed.`);
  };
  const linkChannel = () => {
    mutate((next) => {
      if (next.channels.some((c) => c.walletId === wallet.id && c.type === channelType)) return;
      next.channels.push({ id: uid("CH"), walletId: wallet.id, type: channelType, provider: `${channelType} connection`, accountMask: "Pending provider verification", status: "Linked - sandbox", verified: false });
      audit(next, workspaceName(role, customer, fi, supplier), `Added ${channelType} integration profile`, wallet.id);
    });
    notify(`${channelType} channel profile added. Production credentials are required for real cash movement.`);
  };
  return <section><SectionTitle title="TijaPass wallet & payment ecosystem" text="Each registered entity has its own wallet. Internal transfers are instant ledger movements; cash-in/out is routed through linked bank/mobile-money rails once production APIs and partner approvals are configured." />
    <div className="wallet-hero"><div><span>{wallet.name}</span><strong>{money(wallet.balance)}</strong><small>{wallet.id} • {wallet.status}</small></div><ShieldCheck size={32} /></div>
    {role === "Customer" && <div className="reserve-strip"><div><span>Wallet balance</span><b>{money(position.balance)}</b></div><div><span>Repayment reserve</span><b>{money(position.reserved)}</b></div><div><span>Available to withdraw</span><b>{money(position.available)}</b></div><p><LockKeyhole size={15} />Due/overdue repayments reserve only the necessary amount. Deposits and ordinary business payments remain available subject to the reserve.</p></div>}
    <div className="grid-3"><Panel title="Cash in / cash out"><div className="segmented"><button className={mode === "Deposit" ? "active" : ""} onClick={() => setMode("Deposit")}>Deposit</button><button className={mode === "Withdraw" ? "active" : ""} onClick={() => setMode("Withdraw")}>Withdraw</button></div><Field type="number" label="Amount (TZS)" value={amount} onChange={(v) => setAmount(Number(v))} /><SelectField label="External channel" value={channelType} onChange={setChannelType} options={["Mobile Money", "Bank"]} /><button className="primary wide" onClick={cashMove}>{mode === "Deposit" ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}{mode}</button><small className="muted">V4 includes the complete control flow. Actual provider settlement requires configured production APIs/credentials.</small></Panel>
      <Panel title="Linked channels">{channels.length ? channels.map((c) => <div className="channel" key={c.id}><span>{c.type === "Bank" ? <Landmark size={18} /> : <Smartphone size={18} />}<b>{c.provider}</b></span><small>{c.accountMask}</small><em>{c.status}</em></div>) : <Empty title="No linked channels" />}<SelectField label="Add channel" value={channelType} onChange={setChannelType} options={["Mobile Money", "Bank"]} /><button className="secondary wide" onClick={linkChannel}><Link2 size={17} />Link channel</button></Panel>
      <Panel title="Role-specific action">{role === "Customer" && <><Callout icon={HandCoins}>Repay active finance directly from the business wallet. The lender wallet receives the repayment and the schedule updates immediately.</Callout><Field type="number" label="Repayment amount (TZS)" value={amount} onChange={(v) => setAmount(Number(v))} /><button className="primary wide" onClick={repay}><Send size={17} />Repay finance</button></>}{role === "Supplier" && <><SelectField label="Pay verified supplier" value={targetSupplier} onChange={setTargetSupplier} options={data.suppliers.filter((s) => s.id !== supplier.id).map((s) => ({ value: s.id, label: s.name }))} /><Field type="number" label="Amount (TZS)" value={amount} onChange={(v) => setAmount(Number(v))} /><button className="primary wide" onClick={supplierTransfer}><Send size={17} />Transfer to supplier</button>{supplierFinanceLoans.length > 0 && <div className="special-refund"><SelectField label="Special FI refund linked to finance" value={refundLoanId} onChange={setRefundLoanId} options={supplierFinanceLoans.map((l) => ({ value: l.id, label: `${l.id} • ${data.financialInstitutions.find((f) => f.id === l.fiId)?.name}` }))} /><button className="secondary wide" onClick={refundLender}><RefreshCw size={17} />Return finance-linked funds to FI</button></div>}<small className="muted">Supplier → FI transfers are only available as a documented refund/settlement against a specific financed transaction, never as a generic transfer.</small></>}{role === "Financial Institution" && <Checklist items={["Fund this wallet before disbursement", "Loan disbursements follow approved application route", "Repayments are credited directly to lender wallet", "TFL fees are posted as separate wallet transactions"]} />}{role === "TFL Admin" && <Checklist items={["TFL treasury receives platform fees", "TFL can operate its own finance products", "TFL supervises exception approvals and collections", "Maker-checker and API controls are production requirements"]} />}</Panel></div>
    <Panel title="Wallet transaction ledger"><Table headers={["Date", "Category", "Counterparty", "Amount", "Source", "Reference"]} rows={rows.map((t) => [t.date, t.category, t.counterparty, `${t.toWalletId === wallet.id ? "+" : "-"}${money(t.amount)}`, t.source, t.reference])} /></Panel>
  </section>;
}

function Partners({ data, mutate, fi, setFiId, notify, audit }) {
  const [name, setName] = useState(""); const [type, setType] = useState("Commercial bank"); const [opening, setOpening] = useState(0);
  const addFI = () => {
    if (!name.trim()) return notify("Enter the institution name.", "error");
    mutate((next) => {
      const id = uid("FI"); const walletId = uid("W-FI");
      next.financialInstitutions.push({ id, name: name.trim(), type, status: "Onboarding", walletId, isTFL: false, contact: "", accessStatus: "Pending due diligence" });
      next.wallets.push({ id: walletId, entityType: "Financial Institution", entityId: id, name: `${name.trim()} Funding Wallet`, balance: Number(opening) || 0, status: "Pending activation", currency: "TZS" });
      audit(next, "TFL Admin", "Registered new financial institution", id);
      setFiId(id);
    }); setName(""); setOpening(0); notify("Financial institution registered with its own funding wallet.");
  };
  const feeRows = data.ledger.filter((t) => ["TFL access fee", "TFL disbursement fee", "TFL collection fee"].includes(t.category) && t.toWalletId === "W-TFL").map((t) => { const payerWallet = data.wallets.find((w) => w.id === t.fromWalletId); const payer = data.financialInstitutions.find((f) => f.walletId === payerWallet?.id); return [t.date, payer?.name || payerWallet?.name || "Partner", t.category, t.reference, money(t.amount)]; });
  return <section><SectionTitle title="Partners & financial institutions" text="TFL registers and governs multiple financial institutions. Each FI has separate permissions, product pricing, wallet funds, portfolio and TFL billing records." /><div className="grid-2"><Panel title="Registered institutions"><Table headers={["Institution", "Type", "Status", "Funding wallet", "Access"]} rows={data.financialInstitutions.map((f) => { const w = data.wallets.find((x) => x.id === f.walletId); return [f.name, f.type, <Status key={f.id} value={f.status} />, money(w?.balance), f.accessStatus]; })} /></Panel><Panel title="Register institution"><Field label="Institution name" value={name} onChange={setName} /><SelectField label="Institution type" value={type} onChange={setType} options={["Commercial bank", "Microfinance institution", "SACCO", "Fintech lender", "Other approved financier"]} /><Field type="number" label="Opening wallet balance (test TZS)" value={opening} onChange={(v) => setOpening(Number(v))} /><button className="primary wide" onClick={addFI}><Plus size={17} />Register institution</button></Panel></div><Panel title="TFL commercial model"><Table headers={["Charge", "Trigger", "Who pays", "Current configuration"]} rows={[["Information-view fee", "FI unlocks a permissioned customer finance profile", "Financial institution", money(data.settings.viewFee)], ["Disbursement fee", "Successful loan disbursement", "Financial institution", pct(data.settings.disbursementFeePct)], ["Collection service", "TFL collects/monitors repayment where selected", "Financial institution", pct(data.settings.collectionFeePct)], ["Other partner services", "Configured by contract", "Financial institution / partner", "Optional"]]} /></Panel><Panel title="FI fee statement / billing ledger"><Table headers={["Date", "Financial institution", "Charge", "Reference", "Amount"]} rows={feeRows} /></Panel></section>;
}

function Products({ data, fi, mutate, notify, audit }) {
  const [form, setForm] = useState({ name: "New MSME Finance Product", annualRate: 18, processingFeePct: 2, fixedFee: 0, minAmount: 500000, maxAmount: 5000000, tenorMonths: 6, installmentCount:6, repaymentFrequency: "Monthly", directToSupplier: true, customerDisbursementException: true });
  const products = data.products.filter((p) => p.fiId === fi.id);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const add = () => { mutate((next) => { const id = uid("PROD"); next.products.push({ id, fiId: fi.id, ...form, status: "Active" }); audit(next, fi.name, "Created finance product", id); }); notify("Finance product created."); };
  return <section><SectionTitle title="Finance products & pricing" text="Each financial institution controls its own interest rate, customer fees, ticket size, tenor and approved disbursement rules. Customers see the complete cost before accepting an offer." /><div className="grid-2"><Panel title={`${fi.name} products`}><Table headers={["Product", "Rate", "Fees", "Limits", "Tenor", "Route"]} rows={products.map((p) => [p.name, pct(p.annualRate), `${pct(p.processingFeePct)} + ${money(p.fixedFee)}`, `${money(p.minAmount)} – ${money(p.maxAmount)}`, `${p.installmentCount||p.tenorMonths} ${p.repaymentFrequency||"Monthly"}`, p.customerDisbursementException ? "Supplier / exception customer" : "Supplier only"])} /></Panel><Panel title="Create product"><FormGrid><Field label="Product name" value={form.name} onChange={(v) => set("name", v)} /><Field type="number" label="Annual rate (%)" value={form.annualRate} onChange={(v) => set("annualRate", Number(v))} /><Field type="number" label="Processing fee (%)" value={form.processingFeePct} onChange={(v) => set("processingFeePct", Number(v))} /><Field type="number" label="Fixed fee (TZS)" value={form.fixedFee} onChange={(v) => set("fixedFee", Number(v))} /><Field type="number" label="Minimum amount" value={form.minAmount} onChange={(v) => set("minAmount", Number(v))} /><Field type="number" label="Maximum amount" value={form.maxAmount} onChange={(v) => set("maxAmount", Number(v))} /><SelectField label="Repayment frequency" value={form.repaymentFrequency} onChange={(v) => set("repaymentFrequency", v)} options={["Daily","Weekly","Monthly"]} /><Field type="number" label="Number of instalments" value={form.installmentCount} onChange={(v) => {set("installmentCount", Number(v));}} /></FormGrid><label className="toggle-row"><input type="checkbox" checked={form.customerDisbursementException} onChange={(e) => set("customerDisbursementException", e.target.checked)} /><span><b>Allow exceptional customer-wallet disbursement</b><small>Still requires explicit TFL approval for each loan.</small></span></label><button className="primary wide" onClick={add}><Plus size={17} />Create product</button></Panel></div></section>;
}

function SupplierOperations({ data, role, customer, supplier, mutate, notify, audit, addNotification }) {
  const effectiveSupplier = role === "Supplier" ? supplier : data.suppliers.find((s) => s.id === customer.preferredSupplierId) || data.suppliers[0];
  const [supplierId, setSupplierId] = useState(effectiveSupplier.id);
  const sup = data.suppliers.find((s) => s.id === supplierId) || effectiveSupplier;
  const [customerId, setCustomerId] = useState(customer.id);
  const cust = data.customers.find((c) => c.id === customerId);
  const [description, setDescription] = useState("Productive business asset / stock"); const [amount, setAmount] = useState(1000000); const [itemType, setItemType] = useState("Asset / equipment");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierCategory, setNewSupplierCategory] = useState("General business supplies");
  const addSupplier = () => {
    if (!newSupplierName.trim()) return notify("Enter the supplier name.", "error");
    let newId = "";
    mutate((next) => {
      newId = uid("SUP"); const walletId = uid("W-SUP");
      next.suppliers.push({ id: newId, name: newSupplierName.trim(), category: newSupplierCategory, phone: "", email: "", status: "Pending verification", walletId, bankLinked: false, mobileLinked: false });
      next.wallets.push({ id: walletId, entityType: "Supplier", entityId: newId, name: `${newSupplierName.trim()} Wallet`, balance: 0, status: "Pending activation", currency: "TZS" });
      audit(next, "TFL Admin", "Registered supplier for verification", newId);
    });
    setSupplierId(newId); setNewSupplierName(""); notify("Supplier registered with a separate wallet and pending verification.");
  };
  const quotes = data.quotes.filter((q) => q.supplierId === sup.id);
  const orders = data.orders.filter((o) => o.supplierId === sup.id);
  const invoices = data.invoices.filter((i) => i.supplierId === sup.id);
  const issueQuote = () => { mutate((next) => { const id = uid("QT"); next.quotes.unshift({ id, customerId, supplierId: sup.id, description, itemType, amount: Number(amount), validUntil: addMonths(todayISO(), 1), status: "Issued", createdAt: todayISO() }); audit(next, sup.name, "Issued supplier quotation", id); addNotification(next, { role: "Customer", entityId: customerId, title: "Supplier quotation received", body: `${sup.name} issued ${id} for ${money(amount)}.` }); }); notify("Quotation issued."); };
  const acceptQuote = (quoteId) => { mutate((next) => { const q = next.quotes.find((x) => x.id === quoteId); q.status = "Accepted"; const id = uid("PO"); next.orders.unshift({ id, quoteId: q.id, customerId: q.customerId, supplierId: q.supplierId, amount: q.amount, itemType: q.itemType || "Asset / equipment", status: "Open", createdAt: todayISO() }); const loan = next.loans.find((l) => l.customerId === q.customerId && l.supplierId === q.supplierId && ["Accepted", "Offered", "Submitted"].includes(l.status)); if (loan) { loan.quoteId = q.id; if (loan.status === "Accepted") loan.status = "Ready to disburse"; } audit(next, role, "Accepted quotation and created purchase order", id); }); notify("Quotation accepted and purchase order created."); };
  const issueInvoice = (orderId) => { mutate((next) => { const order = next.orders.find((o) => o.id === orderId); const id = uid("INV"); next.invoices.unshift({ id, orderId, customerId: order.customerId, supplierId: order.supplierId, amount: order.amount, itemType: order.itemType || "Asset / equipment", status: "Issued", issuedAt: todayISO(), deliveryStatus: "Pending", deliveredAt: null }); order.status = "Invoiced"; const loan = next.loans.find((l) => l.customerId === order.customerId && l.supplierId === order.supplierId && ["Accepted", "Ready to disburse"].includes(l.status)); if (loan) { loan.invoiceId = id; loan.status = "Ready to disburse"; } audit(next, sup.name, "Issued supplier invoice", id); }); notify("Invoice issued and finance record updated."); };
  const deliver = (invoiceId) => { mutate((next) => { const inv = next.invoices.find((i) => i.id === invoiceId); if (inv.deliveryStatus === "Delivered") return; inv.deliveryStatus = "Delivered"; inv.deliveredAt = todayISO(); const deliveredCustomer = next.customers.find((c) => c.id === inv.customerId); if (deliveredCustomer) { if (inv.itemType === "Inventory / stock") deliveredCustomer.inventoryValue = Number(deliveredCustomer.inventoryValue || 0) + Number(inv.amount || 0); else deliveredCustomer.businessAssets = Number(deliveredCustomer.businessAssets || 0) + Number(inv.amount || 0); } audit(next, sup.name, "Confirmed delivery and updated customer business position", invoiceId); addNotification(next, { role: "Customer", entityId: inv.customerId, severity: "success", title: "Delivery confirmed", body: `${sup.name} confirmed delivery for ${invoiceId}; the delivered value was added to your business-position records.` }); }); notify("Delivery confirmation recorded and business position updated."); };
  return <section><SectionTitle title="Supplier commerce workflow" text="Quotation → customer/TFL review → purchase order → invoice → FI wallet payment → delivery confirmation. Every document is linked to the customer and finance record." />
    {role !== "Supplier" && <div className="selector-strip"><b>Supplier</b><CompactSelect value={supplierId} onChange={setSupplierId} options={data.suppliers.map((s) => [s.id, s.name])} /></div>}
    {role === "TFL Admin" && <Panel title="Register supplier"><div className="form-grid"><Field label="Supplier name" value={newSupplierName} onChange={setNewSupplierName} /><Field label="Category" value={newSupplierCategory} onChange={setNewSupplierCategory} /></div><button className="secondary" onClick={addSupplier}><Plus size={16} />Register supplier</button></Panel>}
    <div className="grid-2"><Panel title="Issue quotation"><SelectField label="Customer" value={customerId} onChange={setCustomerId} options={data.customers.map((c) => ({ value: c.id, label: c.businessName }))} /><Field label="Goods / asset description" value={description} onChange={setDescription} /><SelectField label="Item type" value={itemType} onChange={setItemType} options={["Asset / equipment", "Inventory / stock"]} /><Field type="number" label="Quotation amount (TZS)" value={amount} onChange={(v) => setAmount(Number(v))} /><button className="primary wide" onClick={issueQuote}><FileText size={17} />Issue quotation</button></Panel><Panel title="Supplier status"><DataRow label="Supplier" value={sup.name} /><DataRow label="Verification" value={sup.status} /><DataRow label="Wallet" value={money(data.wallets.find((w) => w.id === sup.walletId)?.balance)} /><DataRow label="Bank channel" value={sup.bankLinked ? "Available" : "Not yet linked"} /><DataRow label="Mobile money" value={sup.mobileLinked ? "Available" : "Not yet linked"} /></Panel></div>
    <Panel title="Quotations"><Table headers={["Quote", "Customer", "Description", "Type", "Amount", "Status", "Action"]} rows={quotes.map((q) => [q.id, data.customers.find((c) => c.id === q.customerId)?.businessName, q.description, q.itemType || "Asset / equipment", money(q.amount), <Status key={q.id} value={q.status} />, q.status === "Issued" ? <button key={`q-${q.id}`} className="mini-action" onClick={() => acceptQuote(q.id)}>Accept / create PO</button> : "—"])} /></Panel>
    <div className="grid-2"><Panel title="Purchase orders"><Table headers={["PO", "Amount", "Status", "Action"]} rows={orders.map((o) => [o.id, money(o.amount), <Status key={o.id} value={o.status} />, !data.invoices.some((i) => i.orderId === o.id) ? <button key={`i-${o.id}`} className="mini-action" onClick={() => issueInvoice(o.id)}>Issue invoice</button> : "Invoiced"])} /></Panel><Panel title="Invoices & delivery"><Table headers={["Invoice", "Amount", "Payment", "Delivery", "Action"]} rows={invoices.map((i) => [i.id, money(i.amount), <Status key={`${i.id}-p`} value={i.status} />, <Status key={`${i.id}-d`} value={i.deliveryStatus} />, i.deliveryStatus !== "Delivered" ? <button key={`d-${i.id}`} className="mini-action" onClick={() => deliver(i.id)}>Confirm delivery</button> : "Delivered"])} /></Panel></div>
  </section>;
}

function Notifications({ data, role, customer, fi, supplier, mutate }) {
  const rows = data.notifications.filter((n) => notificationBelongs(n, role, customer.id, fi.id, supplier.id));
  const readAll = () => mutate((next) => next.notifications.forEach((n) => { if (notificationBelongs(n, role, customer.id, fi.id, supplier.id)) n.read = true; }));
  return <section><SectionTitle title="Reminders, warnings & action alerts" text="Notifications surface the events each party needs to act on: KYC, data evidence, finance offers, wallet funding, supplier documents, repayments and arrears." /><div className="button-row end"><button className="secondary" onClick={readAll}><CheckCircle2 size={16} />Mark all read</button></div><div className="notification-list">{rows.map((n) => <div className={`notification ${n.severity} ${n.read ? "read" : ""}`} key={n.id}><div><NotificationIcon severity={n.severity} /></div><div><span>{n.date}</span><h3>{n.title}</h3><p>{n.body}</p></div><em>{n.read ? "Read" : "New"}</em></div>)}{!rows.length && <Empty title="No notifications" />}</div></section>;
}

function Controls({ data, mutate, resetPlatform }) {
  const [settings, setSettings] = useState({ ...data.settings });
  useEffect(() => setSettings({ ...data.settings }), [data.settings]);
  const save = () => mutate((next) => Object.assign(next.settings, settings));
  const backendConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
  return <section><SectionTitle title="Governance, commercial controls & production readiness" text="Central settings keep TFL fees, data-quality policy, repayment controls and external payment readiness explicit and auditable." />
    <div className="grid-3"><Panel title="TFL fee configuration"><Field type="number" label="Information-view fee (TZS)" value={settings.viewFee} onChange={(v) => setSettings((s) => ({ ...s, viewFee: Number(v) }))} /><Field type="number" label="Disbursement fee (%)" value={settings.disbursementFeePct} onChange={(v) => setSettings((s) => ({ ...s, disbursementFeePct: Number(v) }))} /><Field type="number" label="Collection fee (%)" value={settings.collectionFeePct} onChange={(v) => setSettings((s) => ({ ...s, collectionFeePct: Number(v) }))} /><button className="primary wide" onClick={save}>Save fee settings</button></Panel><Panel title="Production connectors"><DataRow label="Application data mode" value={backendConfigured ? "Supabase variables detected • database adapter still required" : "Browser persistence • production database not connected"} /><DataRow label="External cash rails" value={settings.externalRailsLive ? "Enabled" : "Sandbox / API-ready"} /><DataRow label="PWA" value="Enabled" /><DataRow label="Bank/mobile APIs" value="Credentials required" /><Callout icon={AlertTriangle}>Do not treat browser-persisted balances as real stored value. Production use requires the included backend schema, authentication/RLS, secure server-side transaction functions and approved payment partner integrations.</Callout></Panel><Panel title="Core controls"><Checklist items={["Role-based access model", "Customer consent scope", "TFL verification workflow", "Reliable-data filter", "Double-entry-ready wallet events", "FI view-fee gate", "Supplier-direct default disbursement", "Customer-route exception approval", "Repayment reserve instead of blanket freeze", "Audit trail & notifications"]} /></Panel></div>
    <Panel title="Recent audit trail"><Table headers={["Time", "Actor", "Action", "Subject"]} rows={data.audit.slice(0, 25).map((a) => [a.date.replace("T", " ").slice(0, 16), a.actor, a.action, a.subject])} /></Panel>
    <div className="danger-zone"><div><b>Reset test data</b><span>Restores the full V4 starting dataset in this browser.</span></div><button onClick={resetPlatform}><Trash2 size={16} />Reset</button></div>
  </section>;
}

function LoanSummary({ data, loan }) {
  const lender = data.financialInstitutions.find((f) => f.id === loan.fiId);
  return <div className="loan-summary"><DataRow label="Lender" value={lender?.name} /><DataRow label="Principal" value={money(loan.approvedAmount || loan.requestedAmount)} /><DataRow label="Rate" value={loan.annualRate ? pct(loan.annualRate) : "—"} /><DataRow label="Interest" value={money(loan.totalInterest)} /><DataRow label="Fees" value={money(loan.processingFee)} /><DataRow label="Total repayment" value={money(loan.totalRepayment)} /><DataRow label="Outstanding principal" value={money(loan.outstanding)} /><DataRow label="Standing instruction" value={loan.standingOrder ? "Active" : "Inactive"} /></div>;
}

function Hero({ eyebrow, title, text, actions }) { return <div className="hero"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{text}</p>{actions && <div className="hero-actions">{actions}</div>}</div><div className="hero-mark"><img src={logoDark} alt="TijaPass" /><small>TRUST • ACCESS • GROW</small></div></div>; }
function SectionTitle({ title, text }) { return <div className="section-title"><h1>{title}</h1><p>{text}</p></div>; }
function Panel({ title, children, className = "" }) { return <div className={`panel ${className}`}><div className="panel-head"><h2>{title}</h2></div>{children}</div>; }
function MetricGrid({ items }) { return <div className="metric-grid">{items.map(([Icon, value, label], i) => <div className="metric" key={`${label}-${i}`}><div><Icon size={20} /></div><strong>{value}</strong><span>{label}</span></div>)}</div>; }
function DataRow({ label, value, strong = false }) { return <div className={`data-row ${strong ? "strong" : ""}`}><span>{label}</span><b>{value}</b></div>; }
function FormGrid({ children }) { return <div className="form-grid">{children}</div>; }
function Field({ label, value, onChange, type = "text", placeholder = "" }) { return <label className="field"><span>{label}</span><input type={type} value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} /></label>; }
function TextArea({ label, value, onChange }) { return <label className="field"><span>{label}</span><textarea value={value || ""} rows={4} onChange={(e) => onChange(e.target.value)} /></label>; }
function SelectField({ label, value, onChange, options }) { return <label className="field"><span>{label}</span><select value={value ?? ""} onChange={(e) => onChange(e.target.value)}>{options.map((o) => typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>; }
function CompactSelect({ value, onChange, options }) { return <select className="compact-select" value={value} onChange={(e) => onChange(e.target.value)}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>; }
function Status({ value }) { const v = String(value || ""); const tone = /verified|active|paid|completed|accepted|delivered|success/i.test(v) ? "green" : /overdue|failed|cancelled|blocked/i.test(v) ? "red" : /pending|submitted|under|upcoming|issued|open|in progress|monitoring|onboarding/i.test(v) ? "amber" : "blue"; return <span className={`status ${tone}`}>{v}</span>; }
function Signal({ label, value }) { const n = Math.max(0, Math.min(100, Number(value || 0))); return <div className="signal"><div><span>{label}</span><b>{Math.round(n)}</b></div><div className="signal-track"><i style={{ width: `${n}%` }} /></div></div>; }
function ScoreDial({ score, band, compact = false }) { const deg = Math.max(0, Math.min(100, score)); return <div className={`score-dial ${compact ? "compact" : ""}`} style={{ "--score": `${deg * 3.6}deg` }}><div><span>TijaPass</span><strong>{score}</strong><em>{band}</em></div></div>; }
function Checklist({ items }) { return <div className="checklist">{items.map((item) => <div key={item}><CheckCircle2 size={16} /><span>{item}</span></div>)}</div>; }
function Callout({ icon: Icon, children }) { return <div className="callout"><Icon size={18} /><span>{children}</span></div>; }
function ControlLine({ icon: Icon, title, text }) { return <div className="control-line"><div><Icon size={19} /></div><span><b>{title}</b><small>{text}</small></span></div>; }
function Flow({ steps }) { return <div className="flow">{steps.map((s, i) => <React.Fragment key={s}><div className="flow-step"><span>{String(i + 1).padStart(2, "0")}</span><b>{s}</b></div>{i < steps.length - 1 && <ArrowRight size={15} />}</React.Fragment>)}</div>; }
function Table({ headers, rows }) { return <div className="table-wrap"><table><thead><tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.length ? rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>) : <tr><td colSpan={headers.length}>No records yet.</td></tr>}</tbody></table></div>; }
function Empty({ title }) { return <div className="empty"><Database size={28} /><b>{title}</b></div>; }
function SourceIcon({ source }) { if (source.includes("bank")) return <Landmark size={16} />; if (source.includes("mobile")) return <Smartphone size={16} />; if (source.includes("wallet")) return <WalletCards size={16} />; return <FileCheck2 size={16} />; }
function NotificationIcon({ severity }) { return severity === "warning" ? <AlertTriangle size={20} /> : severity === "success" ? <CheckCircle2 size={20} /> : <Bell size={20} />; }

