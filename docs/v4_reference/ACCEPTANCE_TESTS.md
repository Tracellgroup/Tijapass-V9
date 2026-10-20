# TijaPass V4 Acceptance Tests

Run these in sequence after deployment. Reset test data from **TFL Admin → Controls** if required.

## 1. MSME onboarding
1. Open **TFL Admin → MSME Onboarding**.
2. Click **New MSME**.
3. Capture/upload profile photo and ID.
4. Enter mobile, DOB, NIDA, addresses and business fields.
5. Record consent and training information.
6. Save and verify.
7. Expected: customer has unique passport + wallet; incomplete profile cannot be verified below threshold.

## 2. Reliable business data
1. Open Customer → Business Transactions.
2. Post a TijaPass wallet / linked bank / linked mobile-money sale.
3. Post rent/utilities/stock expense.
4. Post one Manual Entry.
5. Expected: trusted-source records feed statements immediately; manual record stays Pending Verification.
6. TFL Admin verifies manual record.
7. Expected: it then feeds statements/scoring.

## 3. Credit passport
1. Open Credit Passport.
2. Expected: score, indicative limit and data-source coverage are generated from current records.
3. Create a new customer without sufficient records.
4. Expected: finance limit remains zero until the minimum eligibility/data conditions are met.

## 4. FI access fee
1. Switch to Financial Institution and select a non-TFL FI with an application.
2. Open Finance Decisions.
3. If profile locked, click **Pay fee & unlock**.
4. Expected: FI wallet decreases, TFL wallet increases, access grant is created and profile details appear.

## 5. FI offer and customer acceptance
1. FI sets annual rate, processing fee and tenor.
2. Create offer.
3. Switch to Customer → Finance.
4. Expected: customer sees principal, interest amount, fees, total repayment and schedule.
5. Accept offer.

## 6. Supplier workflow
1. Switch to Supplier or TFL Supplier Operations.
2. Issue quotation for the customer.
3. Accept/create PO.
4. Issue invoice.
5. Expected: accepted finance becomes Ready to Disburse when required supplier documents are linked.

## 7. FI funding and disbursement
1. Switch to FI → Funding Wallet.
2. Deposit test funds if needed.
3. Open Finance Decisions and disburse.
4. Expected: FI wallet decreases; supplier wallet increases; TFL disbursement fee posts separately; loan becomes Active.

## 8. Exceptional customer disbursement
1. Create a product/application with Customer route.
2. Expected: FI cannot disburse until TFL approves exception.
3. TFL Admin approves exception in Finance Operations.
4. Expected: FI can then disburse to customer wallet.

## 9. Repayment and standing instruction
1. Customer funds wallet.
2. Customer can manually repay from wallet.
3. TFL can run due-date controls from Finance Operations.
4. Expected: lender wallet increases, schedule/loan outstanding updates, notifications are generated.

## 10. Withdrawal reserve
1. Use a customer with amount due/overdue.
2. Open Customer → Wallet.
3. Expected: wallet shows Balance, Repayment Reserve and Available to Withdraw.
4. Attempt withdrawal above available amount.
5. Expected: blocked with clear message; customer can still deposit.

## 11. Supplier transfer restrictions
1. Supplier can pay another verified supplier.
2. Generic supplier → FI transfer is not offered.
3. Finance-linked supplier refund can only target the FI on a specific linked loan.

## 12. Persistence
1. Complete several transactions.
2. Refresh browser and reopen app.
3. Expected in V4 browser mode: data remains in the same browser through localStorage.
4. Production acceptance must repeat this across devices after Supabase integration.
