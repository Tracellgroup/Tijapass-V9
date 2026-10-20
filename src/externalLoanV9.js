const dateValid=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(new Date(`${d}T12:00:00Z`).getTime());
export function validateExternalLoan(f){
 const reasons=[];
 if(!String(f.lender||'').trim())reasons.push('Name of lender is required.');
 if(!Number.isFinite(Number(f.balance))||Number(f.balance)<=0)reasons.push('Outstanding principal must be positive.');
 if(!Number.isFinite(Number(f.installment))||Number(f.installment)<=0)reasons.push('Installment amount must be positive.');
 if(!['Daily','Weekly','Monthly'].includes(f.frequency))reasons.push('Select a valid repayment frequency.');
 if(!Number.isInteger(Number(f.remainingInstallments))||Number(f.remainingInstallments)<1||Number(f.remainingInstallments)>1200)reasons.push('Enter 1–1200 remaining instalments.');
 if(!dateValid(f.nextDueDate))reasons.push('Enter a valid next repayment date.');
 if(Number(f.balance)>Number(f.installment)*Number(f.remainingInstallments))reasons.push('Outstanding principal exceeds all remaining instalments; please confirm balance, term or instalment.');
 return reasons;
}
