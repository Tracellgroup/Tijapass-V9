import {creditAssessmentV9, maxAffordablePrincipalV9} from "./creditV9.js";
export const money = (value = 0) => `TZS ${new Intl.NumberFormat("en-TZ", { maximumFractionDigits: 0 }).format(Math.round(Number(value) || 0))}`;
export const number = (value = 0) => new Intl.NumberFormat("en-TZ", { maximumFractionDigits: 0 }).format(Math.round(Number(value) || 0));
export const pct = (value = 0, digits = 1) => `${Number(value || 0).toFixed(digits)}%`;
export const todayISO = () => new Date().toISOString().slice(0, 10);
export const uid = (prefix = "TP") => `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

export function addMonths(dateValue, count) {
  const d = new Date(dateValue);
  d.setMonth(d.getMonth() + count);
  return d.toISOString().slice(0, 10);
}

export function buildAmortizationSchedule({ principal, annualRate, tenorMonths, firstDueDate, oneTimeFee = 0 }) {
  const P = Math.max(0, Number(principal) || 0);
  const n = Math.max(1, Number(tenorMonths) || 1);
  const r = Math.max(0, Number(annualRate) || 0) / 100 / 12;
  const installment = r === 0 ? P / n : (P * r) / (1 - Math.pow(1 + r, -n));
  let balance = P;
  const rows = [];
  for (let i = 1; i <= n; i += 1) {
    const interest = r === 0 ? 0 : balance * r;
    const principalPart = Math.min(balance, Math.max(0, installment - interest));
    balance = Math.max(0, balance - principalPart);
    const fee = i === 1 ? Number(oneTimeFee || 0) : 0;
    const principalRounded = Math.round(principalPart);
    const interestRounded = Math.round(interest);
    const feeRounded = Math.round(fee);
    rows.push({
      no: i,
      dueDate: addMonths(firstDueDate, i - 1),
      openingBalance: Math.round(balance + principalPart),
      principal: principalRounded,
      interest: interestRounded,
      fee: feeRounded,
      amountDue: principalRounded + interestRounded + feeRounded,
      closingBalance: Math.round(balance),
      paid: 0,
      status: "Upcoming"
    });
  }
  return rows;
}

export function financeQuote({ amount, annualRate, processingFeePct, fixedFee = 0, tenorMonths, firstDueDate }) {
  const principal = Math.max(0, Number(amount) || 0);
  const processingFee = principal * (Number(processingFeePct || 0) / 100) + Number(fixedFee || 0);
  const schedule = buildAmortizationSchedule({ principal, annualRate, tenorMonths, firstDueDate, oneTimeFee: processingFee });
  const totalInterest = schedule.reduce((sum, row) => sum + row.interest, 0);
  const totalRepayment = schedule.reduce((sum, row) => sum + row.amountDue, 0);
  return {
    principal,
    annualRate: Number(annualRate || 0),
    processingFee: Math.round(processingFee),
    totalInterest: Math.round(totalInterest),
    totalRepayment: Math.round(totalRepayment),
    installment: schedule[0]?.amountDue || 0,
    schedule
  };
}

const revenueCategories = new Set(["Sales", "Service income", "Other business income"]);
const cogsCategories = new Set(["Inventory / stock", "Direct materials", "Direct supplier cost"]);
const opexCategories = new Set(["Rent", "Utilities", "Salaries", "Transport", "Telecom", "Taxes & licences", "Marketing", "Maintenance", "Other operating expense"]);

export function isReliableTransaction(tx) {
  return tx.status === "Completed" && tx.verified === true;
}

export function customerLedger(data, customerId) {
  const walletId = data.customers.find((c) => c.id === customerId)?.walletId;
  return data.ledger.filter((tx) => tx.customerId === customerId || tx.fromWalletId === walletId || tx.toWalletId === walletId);
}

export function financialStatements(data, customerId) {
  const customer = data.customers.find((c) => c.id === customerId);
  if (!customer) return null;
  const walletId = customer.walletId;
  const rows = customerLedger(data, customerId).filter(isReliableTransaction);
  let revenue = 0;
  let cogs = 0;
  let opex = 0;
  let operatingInflows = 0;
  let operatingOutflows = 0;
  let financingInflows = 0;
  let financingOutflows = 0;
  let ownerFlows = 0;
  rows.forEach((tx) => {
    const incoming = tx.toWalletId === walletId || tx.direction === "Income";
    const outgoing = tx.fromWalletId === walletId || tx.direction === "Expense";
    if (incoming && revenueCategories.has(tx.category)) revenue += tx.amount;
    if (outgoing && cogsCategories.has(tx.category)) cogs += tx.amount;
    if (outgoing && opexCategories.has(tx.category)) opex += tx.amount;
    if (incoming && revenueCategories.has(tx.category)) operatingInflows += tx.amount;
    if (outgoing && (cogsCategories.has(tx.category) || opexCategories.has(tx.category))) operatingOutflows += tx.amount;
    if (incoming && tx.category === "Loan disbursement") financingInflows += tx.amount;
    if (outgoing && tx.category === "Loan repayment") financingOutflows += tx.amount;
    if (tx.category === "Owner capital" || tx.category === "Owner withdrawal") ownerFlows += incoming ? tx.amount : -tx.amount;
  });
  const grossProfit = revenue - cogs;
  const operatingProfit = grossProfit - opex;
  const activeLoans = data.loans.filter((l) => l.customerId === customerId && ["Active", "Overdue"].includes(l.status));
  const loanOutstanding = activeLoans.reduce((sum, l) => sum + Number(l.outstanding || 0), 0);
  const wallet = data.wallets.find((w) => w.id === walletId);
  const assets = Number(customer.businessAssets || 0);
  const inventory = Number(customer.inventoryValue || 0);
  const receivables = Number(customer.receivables || 0);
  const payables = Number(customer.payables || 0);
  const cash = Number(wallet?.balance || 0);
  const totalAssets = cash + inventory + receivables + assets;
  const totalLiabilities = payables + loanOutstanding;
  const equity = totalAssets - totalLiabilities;
  const totalRecords = customerLedger(data, customerId).filter((t) => t.status === "Completed").length;
  const verifiedRecords = rows.length;
  const coverage = totalRecords ? Math.round((verifiedRecords / totalRecords) * 100) : 0;
  const sourceCounts = rows.reduce((acc, tx) => {
    acc[tx.source] = (acc[tx.source] || 0) + 1;
    return acc;
  }, {});
  return {
    revenue,
    cogs,
    grossProfit,
    opex,
    operatingProfit,
    operatingInflows,
    operatingOutflows,
    operatingNetCash: operatingInflows - operatingOutflows,
    financingInflows,
    financingOutflows,
    ownerFlows,
    cash,
    inventory,
    receivables,
    assets,
    totalAssets,
    payables,
    loanOutstanding,
    totalLiabilities,
    equity,
    coverage,
    verifiedRecords,
    totalRecords,
    sourceCounts
  };
}

export function kycCompleteness(customer) {
  const fields = [customer.owner, customer.phone, customer.dob, customer.nida, customer.businessName, customer.sector, customer.businessAddress, customer.residentialAddress, customer.profilePhoto, customer.idDocument, customer.consentAt];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

export function creditProfile(data, customerId) {
  const assessment=creditAssessmentV9(data,customerId);
  const products=(data.products||[]).filter(p=>p.status==='Active');
  const limits=products.map(p=>maxAffordablePrincipalV9(data,customerId,{
    frequency:p.repaymentFrequency||'Monthly',count:p.tenorMonths||6,annualRate:p.annualRate,
    processingFeePct:p.processingFeePct,fixedFee:p.fixedFee,maxAmount:p.maxAmount
  }));
  return {...assessment,limit:assessment.eligibleData?Math.max(0,...limits):0};
}

export function duePosition(data, customerId, asOf = todayISO()) {
  const loans = data.loans.filter((l) => l.customerId === customerId && ["Active", "Overdue"].includes(l.status));
  let due = 0;
  let overdue = 0;
  let nextDue = null;
  loans.forEach((loan) => {
    (loan.schedule || []).forEach((row) => {
      const remaining = Math.max(0, Number(row.amountDue || 0) - Number(row.paid || 0));
      if (remaining <= 0) return;
      if (row.dueDate < asOf) overdue += remaining;
      if (row.dueDate <= asOf) due += remaining;
      if (!nextDue || row.dueDate < nextDue.dueDate) nextDue = { ...row, loanId: loan.id, remaining };
    });
  });
  return { due: Math.round(due), overdue: Math.round(overdue), nextDue };
}

export function walletAvailable(data, walletId) {
  const wallet = data.wallets.find((w) => w.id === walletId);
  if (!wallet) return { balance: 0, reserved: 0, available: 0 };
  if (wallet.entityType !== "Customer") return { balance: wallet.balance, reserved: 0, available: wallet.balance };
  const due = duePosition(data, wallet.entityId);
  const reserve = Math.min(wallet.balance, Math.max(due.overdue, due.due));
  return { balance: wallet.balance, reserved: reserve, available: Math.max(0, wallet.balance - reserve) };
}

export function principalPaidDelta(row, additionalPayment) {
  const before = Math.max(0, Number(row?.paid || 0));
  const after = before + Math.max(0, Number(additionalPayment || 0));
  const nonPrincipal = Number(row?.fee || 0) + Number(row?.interest || 0);
  const principalDue = Number(row?.principal || 0);
  const principalBefore = Math.max(0, Math.min(principalDue, before - nonPrincipal));
  const principalAfter = Math.max(0, Math.min(principalDue, after - nonPrincipal));
  return Math.max(0, principalAfter - principalBefore);
}

export function nextActionForLoan(loan) {
  const map = {
    Draft: "Submit request",
    Submitted: "FI review",
    "Under review": "Create offer",
    Offered: "Customer acceptance",
    Accepted: "Supplier documentation",
    "Ready to disburse": "Disbursement",
    Active: "Repayment",
    Overdue: "Collections",
    Repaid: "Closed"
  };
  return map[loan?.status] || "Review";
}
