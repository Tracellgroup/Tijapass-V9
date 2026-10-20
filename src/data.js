import { buildAmortizationSchedule, addMonths } from "./domain.js";

function seedBusinessLedger() {
  const rows = [];
  const months = ["2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07"];
  const configs = {
    "CUST-1001": { wallet: "W-CUST-1001", sales: 3100000, stock: 1720000, rent: 280000, utilities: 95000, salaries: 350000 },
    "CUST-1002": { wallet: "W-CUST-1002", sales: 2400000, stock: 1380000, rent: 220000, utilities: 85000, salaries: 250000 },
    "CUST-1003": { wallet: "W-CUST-1003", sales: 1550000, stock: 820000, rent: 170000, utilities: 70000, salaries: 180000 }
  };
  Object.entries(configs).forEach(([customerId, cfg], customerIndex) => {
    months.forEach((month, monthIndex) => {
      const factor = 1 + monthIndex * 0.035 + customerIndex * 0.01;
      const sales = Math.round(cfg.sales * factor);
      const stock = Math.round(cfg.stock * factor);
      const idBase = `${customerId}-${month.replace("-", "")}`;
      const salesSource = monthIndex % 2 === 0 ? "Linked mobile money" : "TijaPass wallet";
      rows.push(
        { id: `TX-${idBase}-S`, date: `${month}-05`, fromWalletId: null, toWalletId: salesSource === "TijaPass wallet" ? cfg.wallet : null, amount: sales, category: "Sales", direction: "Income", source: salesSource, verified: true, status: "Completed", customerId, counterparty: "Business customers", reference: `SALES-${month}`, note: "Aggregated verified sales collections" },
        { id: `TX-${idBase}-I`, date: `${month}-08`, fromWalletId: cfg.wallet, toWalletId: null, amount: stock, category: "Inventory / stock", direction: "Expense", source: "TijaPass wallet", verified: true, status: "Completed", customerId, counterparty: "Verified suppliers", reference: `STOCK-${month}`, note: "Inventory purchases" },
        { id: `TX-${idBase}-R`, date: `${month}-10`, fromWalletId: null, toWalletId: null, amount: cfg.rent, category: "Rent", direction: "Expense", source: "Linked bank", verified: true, status: "Completed", customerId, counterparty: "Landlord", reference: `RENT-${month}`, note: "Business premises rent imported from linked bank" },
        { id: `TX-${idBase}-U`, date: `${month}-15`, fromWalletId: null, toWalletId: null, amount: cfg.utilities, category: "Utilities", direction: "Expense", source: "Linked mobile money", verified: true, status: "Completed", customerId, counterparty: "Utility provider", reference: `UTIL-${month}`, note: "Utility payment imported from linked mobile money" },
        { id: `TX-${idBase}-P`, date: `${month}-25`, fromWalletId: cfg.wallet, toWalletId: null, amount: cfg.salaries, category: "Salaries", direction: "Expense", source: "TijaPass wallet", verified: true, status: "Completed", customerId, counterparty: "Employees", reference: `PAY-${month}`, note: "Staff wages" }
      );
    });
  });
  rows.push(
    { id: "TX-MAN-1001", date: "2026-07-21", fromWalletId: null, toWalletId: null, amount: 180000, category: "Other business income", direction: "Income", source: "Manual entry", verified: false, status: "Pending verification", customerId: "CUST-1001", counterparty: "Walk-in customers", reference: "MAN-0721", note: "Cash sales pending TFL evidence check" },
    { id: "TX-LOAN-1001", date: "2026-06-15", fromWalletId: "W-FI-A", toWalletId: "W-SUP-1001", amount: 2200000, category: "Loan disbursement", direction: "Financing", source: "TijaPass wallet", verified: true, status: "Completed", customerId: "CUST-1001", loanId: "LN-2001", counterparty: "Mikocheni Fresh Market Ltd", reference: "INV-0318", note: "Supplier-direct asset finance disbursement" },
    { id: "TX-RPAY-1001-1", date: "2026-07-15", fromWalletId: "W-CUST-1001", toWalletId: "W-FI-A", amount: 401000, category: "Loan repayment", direction: "Financing", source: "TijaPass wallet", verified: true, status: "Completed", customerId: "CUST-1001", loanId: "LN-2001", counterparty: "Partner Bank A", reference: "LN-2001-R1", note: "Standing instruction repayment" }
  );
  return rows;
}

const firstDue = "2026-07-15";
const activeSchedule = buildAmortizationSchedule({ principal: 2200000, annualRate: 18, tenorMonths: 6, firstDueDate: firstDue, oneTimeFee: 44000 });
activeSchedule[0].paid = activeSchedule[0].amountDue;
activeSchedule[0].status = "Paid";
activeSchedule.slice(1).forEach((r) => { r.status = r.dueDate < "2026-08-12" ? "Overdue" : "Upcoming"; });

export const seedData = {
  settings: {
    companyName: "Tracell Finance Limited",
    platformName: "TijaPass",
    baseCurrency: "TZS",
    viewFee: 25000,
    disbursementFeePct: 1.5,
    collectionFeePct: 2,
    customerDirectDisbursementRequiresException: true,
    repaymentReserveEnabled: true,
    externalRailsLive: false,
    dataRetentionYears: 7
  },
  customers: [
    {
      id: "CUST-1001", passportId: "TP-1001", businessName: "Amina Fresh Produce", owner: "Amina M.", gender: "Female", dob: "1992-04-18", phone: "+255 754 111 001", email: "amina@example.com", nida: "19920418-12345-00001-12", sector: "Fresh produce trade", businessAddress: "Kariakoo, Dar es Salaam", residentialAddress: "Ilala, Dar es Salaam", operatingMonths: 42, statementMonths: 6, businessAssets: 4200000, inventoryValue: 1850000, receivables: 420000, payables: 310000, monitoringScore: 92, status: "Verified", trainingStatus: "Completed", profilePhoto: "seed-profile", idDocument: "seed-id", consentAt: "2026-02-01T09:00:00Z", consentScope: "Credit passport, statements, finance review", walletId: "W-CUST-1001", preferredSupplierId: "SUP-1001", assignedOfficer: "Neema - TFL MSME Officer", verificationNotes: "Premises visited; supplier references confirmed; transaction sources linked." },
    {
      id: "CUST-1002", passportId: "TP-1002", businessName: "Kijana Mini Mart", owner: "George K.", gender: "Male", dob: "1998-09-03", phone: "+255 754 111 002", email: "george@example.com", nida: "19980903-12345-00002-11", sector: "Retail mini-mart", businessAddress: "Mbezi, Dar es Salaam", residentialAddress: "Mbezi, Dar es Salaam", operatingMonths: 28, statementMonths: 6, businessAssets: 2800000, inventoryValue: 1400000, receivables: 190000, payables: 260000, monitoringScore: 82, status: "Verified", trainingStatus: "Completed", profilePhoto: "seed-profile", idDocument: "seed-id", consentAt: "2026-03-12T10:20:00Z", consentScope: "Credit passport, statements, finance review", walletId: "W-CUST-1002", preferredSupplierId: "SUP-1002", assignedOfficer: "Neema - TFL MSME Officer", verificationNotes: "KYC complete; digital collections linked; monthly monitoring active." },
    {
      id: "CUST-1003", passportId: "TP-1003", businessName: "Mama Lishe Group", owner: "Rehema S.", gender: "Female", dob: "1988-11-20", phone: "+255 754 111 003", email: "", nida: "19881120-12345-00003-10", sector: "Food service", businessAddress: "Kawe, Dar es Salaam", residentialAddress: "Kawe, Dar es Salaam", operatingMonths: 16, statementMonths: 6, businessAssets: 1250000, inventoryValue: 560000, receivables: 110000, payables: 140000, monitoringScore: 72, status: "Monitoring", trainingStatus: "In progress", profilePhoto: "seed-profile", idDocument: "seed-id", consentAt: "2026-05-02T11:00:00Z", consentScope: "Credit passport, statements", walletId: "W-CUST-1003", preferredSupplierId: "SUP-1003", assignedOfficer: "Paul - TFL Field Officer", verificationNotes: "Business verified; record discipline still being strengthened." }
  ],
  financialInstitutions: [
    { id: "FI-TFL", name: "Tracell Finance Limited", type: "TFL / Financing Institution", status: "Active", walletId: "W-TFL", isTFL: true, contact: "finance@tracellgroup.co.tz", accessStatus: "Full platform operator" },
    { id: "FI-A", name: "Partner Bank A", type: "Commercial bank", status: "Active", walletId: "W-FI-A", isTFL: false, contact: "credit@partner-a.example", accessStatus: "Approved partner" },
    { id: "FI-B", name: "Partner MFI B", type: "Microfinance institution", status: "Active", walletId: "W-FI-B", isTFL: false, contact: "msme@partner-b.example", accessStatus: "Approved partner" },
    { id: "FI-C", name: "Partner SACCO C", type: "SACCO", status: "Onboarding", walletId: "W-FI-C", isTFL: false, contact: "manager@partner-c.example", accessStatus: "Pending final approval" }
  ],
  products: [
    { id: "PROD-TFL-01", fiId: "FI-TFL", name: "TFL Productive Asset Finance", annualRate: 20, processingFeePct: 2, fixedFee: 0, minAmount: 300000, maxAmount: 5000000, tenorMonths: 6, repaymentFrequency: "Monthly", directToSupplier: true, customerDisbursementException: true, status: "Active" },
    { id: "PROD-A-01", fiId: "FI-A", name: "MSME Asset Builder", annualRate: 18, processingFeePct: 2, fixedFee: 0, minAmount: 500000, maxAmount: 10000000, tenorMonths: 6, repaymentFrequency: "Monthly", directToSupplier: true, customerDisbursementException: true, status: "Active" },
    { id: "PROD-B-01", fiId: "FI-B", name: "Biashara Growth Facility", annualRate: 22, processingFeePct: 2.5, fixedFee: 10000, minAmount: 300000, maxAmount: 6000000, tenorMonths: 9, repaymentFrequency: "Monthly", directToSupplier: true, customerDisbursementException: false, status: "Active" }
  ],
  suppliers: [
    { id: "SUP-1001", name: "Mikocheni Fresh Market Ltd", category: "Produce & cold-chain equipment", phone: "+255 754 220 001", email: "orders@mikocheni.example", status: "Verified", walletId: "W-SUP-1001", bankLinked: true, mobileLinked: true },
    { id: "SUP-1002", name: "Mbezi Wholesale Stores", category: "FMCG wholesale", phone: "+255 754 220 002", email: "sales@mbezi.example", status: "Verified", walletId: "W-SUP-1002", bankLinked: true, mobileLinked: false },
    { id: "SUP-1003", name: "Kawe Food Supplies", category: "Food supplies", phone: "+255 754 220 003", email: "kawe@example.com", status: "Verified", walletId: "W-SUP-1003", bankLinked: false, mobileLinked: true }
  ],
  wallets: [
    { id: "W-TFL", entityType: "TFL", entityId: "FI-TFL", name: "TFL Treasury Wallet", balance: 1000000000, status: "Verified", currency: "TZS" },
    { id: "W-FI-A", entityType: "Financial Institution", entityId: "FI-A", name: "Partner Bank A Funding Wallet", balance: 150000000, status: "Verified", currency: "TZS" },
    { id: "W-FI-B", entityType: "Financial Institution", entityId: "FI-B", name: "Partner MFI B Funding Wallet", balance: 65000000, status: "Verified", currency: "TZS" },
    { id: "W-FI-C", entityType: "Financial Institution", entityId: "FI-C", name: "Partner SACCO C Funding Wallet", balance: 0, status: "Pending activation", currency: "TZS" },
    { id: "W-CUST-1001", entityType: "Customer", entityId: "CUST-1001", name: "Amina Fresh Produce Business Wallet", balance: 1460000, status: "Verified", currency: "TZS" },
    { id: "W-CUST-1002", entityType: "Customer", entityId: "CUST-1002", name: "Kijana Mini Mart Business Wallet", balance: 985000, status: "Verified", currency: "TZS" },
    { id: "W-CUST-1003", entityType: "Customer", entityId: "CUST-1003", name: "Mama Lishe Group Business Wallet", balance: 575000, status: "Verified", currency: "TZS" },
    { id: "W-SUP-1001", entityType: "Supplier", entityId: "SUP-1001", name: "Mikocheni Fresh Market Ltd Wallet", balance: 4860000, status: "Verified", currency: "TZS" },
    { id: "W-SUP-1002", entityType: "Supplier", entityId: "SUP-1002", name: "Mbezi Wholesale Stores Wallet", balance: 2140000, status: "Verified", currency: "TZS" },
    { id: "W-SUP-1003", entityType: "Supplier", entityId: "SUP-1003", name: "Kawe Food Supplies Wallet", balance: 920000, status: "Verified", currency: "TZS" }
  ],
  ledger: seedBusinessLedger(),
  loans: [
    {
      id: "LN-2001", customerId: "CUST-1001", fiId: "FI-A", productId: "PROD-A-01", supplierId: "SUP-1001", purpose: "Cold display cabinet and working stock", requestedAmount: 2200000, approvedAmount: 2200000, annualRate: 18, processingFee: 44000, tenorMonths: 6, totalInterest: activeSchedule.reduce((s, r) => s + r.interest, 0), totalRepayment: activeSchedule.reduce((s, r) => s + r.amountDue, 0), outstanding: activeSchedule.slice(1).reduce((s, r) => s + r.principal, 0), status: activeSchedule.some((r) => r.status === "Overdue") ? "Overdue" : "Active", disbursementRoute: "Supplier", standingOrder: true, collectionService: true, createdAt: "2026-06-04", acceptedAt: "2026-06-10", disbursedAt: "2026-06-15", schedule: activeSchedule, quoteId: "QT-3001", invoiceId: "INV-4001", exceptionApproved: false
    },
    {
      id: "LN-2002", customerId: "CUST-1002", fiId: "FI-B", productId: "PROD-B-01", supplierId: "SUP-1002", purpose: "Retail refrigeration and stock", requestedAmount: 1500000, approvedAmount: 0, annualRate: 0, processingFee: 0, tenorMonths: 0, totalInterest: 0, totalRepayment: 0, outstanding: 0, status: "Submitted", disbursementRoute: "Supplier", standingOrder: true, collectionService: false, createdAt: "2026-08-09", schedule: [], quoteId: "QT-3002", invoiceId: null, exceptionApproved: false
    }
  ],
  accessGrants: [
    { id: "ACCESS-1", fiId: "FI-A", customerId: "CUST-1001", status: "Active", paidFee: 25000, grantedAt: "2026-06-03", expiresAt: "2026-12-31" }
  ],
  quotes: [
    { id: "QT-3001", customerId: "CUST-1001", supplierId: "SUP-1001", description: "Cold display cabinet + initial fresh produce stock", itemType: "Asset / equipment", amount: 2200000, validUntil: "2026-06-20", status: "Accepted", createdAt: "2026-06-05" },
    { id: "QT-3002", customerId: "CUST-1002", supplierId: "SUP-1002", description: "Display refrigerator and wholesale stock", itemType: "Asset / equipment", amount: 1500000, validUntil: "2026-08-25", status: "Issued", createdAt: "2026-08-10" }
  ],
  orders: [
    { id: "PO-3501", quoteId: "QT-3001", customerId: "CUST-1001", supplierId: "SUP-1001", amount: 2200000, itemType: "Asset / equipment", status: "Completed", createdAt: "2026-06-11" }
  ],
  invoices: [
    { id: "INV-4001", orderId: "PO-3501", customerId: "CUST-1001", supplierId: "SUP-1001", amount: 2200000, itemType: "Asset / equipment", status: "Paid", issuedAt: "2026-06-12", deliveryStatus: "Delivered", deliveredAt: "2026-06-17" }
  ],
  channels: [
    { id: "CH-1", walletId: "W-CUST-1001", type: "Mobile Money", provider: "Primary mobile wallet", accountMask: "+255 7•• ••• 001", status: "Linked - sandbox", verified: true },
    { id: "CH-2", walletId: "W-CUST-1001", type: "Bank", provider: "Primary bank account", accountMask: "•••• 4821", status: "Linked - sandbox", verified: true },
    { id: "CH-3", walletId: "W-FI-A", type: "Bank", provider: "FI settlement account", accountMask: "•••• 7701", status: "Linked - sandbox", verified: true },
    { id: "CH-4", walletId: "W-SUP-1001", type: "Bank", provider: "Supplier bank", accountMask: "•••• 2118", status: "Linked - sandbox", verified: true }
  ],
  notifications: [
    { id: "N-1", role: "Customer", entityId: "CUST-1001", severity: "warning", title: "Repayment due", body: "A repayment is approaching. Keep sufficient funds in your business wallet.", date: "2026-08-12", read: false },
    { id: "N-2", role: "TFL Admin", entityId: "FI-TFL", severity: "info", title: "Manual transaction requires verification", body: "Amina Fresh Produce has one manual cash-sale record awaiting evidence review.", date: "2026-08-12", read: false },
    { id: "N-3", role: "Financial Institution", entityId: "FI-B", severity: "info", title: "Finance request received", body: "Kijana Mini Mart submitted a TZS 1,500,000 request for review.", date: "2026-08-10", read: false },
    { id: "N-4", role: "Supplier", entityId: "SUP-1002", severity: "info", title: "Quotation awaiting action", body: "Quotation QT-3002 is available for the customer finance workflow.", date: "2026-08-10", read: false }
  ],
  audit: [
    { id: "A-1", date: "2026-08-12T09:15:00Z", actor: "TFL Officer", action: "Reviewed customer transaction quality", subject: "CUST-1001" },
    { id: "A-2", date: "2026-08-10T14:22:00Z", actor: "Partner Bank A", action: "Viewed permissioned customer finance profile", subject: "CUST-1001" },
    { id: "A-3", date: "2026-08-10T13:05:00Z", actor: "Customer", action: "Submitted finance request", subject: "LN-2002" }
  ]
};

export function freshSeedData() {
  const next = JSON.parse(JSON.stringify(seedData));
  next.accountingStaging = [];
  next.accountingJournal = [];
  next.accountingLearning = {};
  for (const customer of next.customers) {
    customer.openingDate = "2026-10-01";
    customer.openingWallet = next.wallets.find(w => w.id === customer.walletId)?.balance || 0;
    customer.openingLoan = next.loans.filter(l => l.customerId === customer.id && ["Active", "Overdue"].includes(l.status)).reduce((s,l)=>s+Number(l.outstanding||0),0);
  }
  return next;
}
