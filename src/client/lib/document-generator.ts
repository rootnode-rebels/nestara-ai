/**
 * Nestara AI — Document & PDF Generator Utility
 * Produces audit-grade, high-fidelity printable receipts and standard residential lease agreements.
 */

export interface ReceiptData {
  receiptNumber: string;
  tenantName: string;
  tenantEmail?: string | null;
  tenantPhone?: string | null;
  propertyName: string;
  propertyAddress?: string | null;
  unitName: string;
  period: string;
  dueDate: string;
  amount: number;
  amountPaid: number;
  status: string;
  paymentMethod?: string;
  paymentReference?: string | null;
  paidAt?: string;
}

export interface LeaseAgreementData {
  agreementNumber: string;
  landlordName: string;
  landlordContact: string;
  tenantName: string;
  tenantPhone?: string | null;
  tenantEmail?: string | null;
  propertyName: string;
  propertyAddress: string;
  propertyCity: string;
  unitName: string;
  bedrooms: number;
  bathrooms: number;
  sqft?: number | null;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  deposit: number;
  rentDueDay: number;
  lateFee: number;
  currency?: string;
}

/**
 * Generates an official, print-ready HTML rent payment receipt.
 */
export function generateRentReceiptHtml(data: ReceiptData): string {
  const isPaid = data.status === "paid" || data.amountPaid >= data.amount;
  const balance = Math.max(0, data.amount - data.amountPaid);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Rent Receipt — ${data.receiptNumber}</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      margin: 0;
      padding: 24px;
      line-height: 1.5;
      font-size: 13px;
    }
    .receipt-container {
      max-width: 680px;
      margin: 0 auto;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 32px;
      background: #ffffff;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0284c7;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .brand h1 {
      margin: 0;
      font-size: 22px;
      color: #0284c7;
      letter-spacing: -0.5px;
    }
    .brand p {
      margin: 2px 0 0;
      font-size: 11px;
      color: #64748b;
    }
    .receipt-badge {
      text-align: right;
    }
    .receipt-title {
      font-size: 16px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0f172a;
    }
    .receipt-num {
      font-size: 12px;
      color: #64748b;
      font-family: monospace;
    }
    .status-badge {
      display: inline-block;
      margin-top: 6px;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      background: ${isPaid ? "#dcfce7" : "#fef3c7"};
      color: ${isPaid ? "#166534" : "#92400e"};
      border: 1px solid ${isPaid ? "#86efac" : "#fde68a"};
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 28px;
    }
    .meta-box h3 {
      margin: 0 0 6px;
      font-size: 11px;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 0.5px;
    }
    .meta-box p {
      margin: 0;
      font-size: 13px;
      font-weight: 500;
      color: #0f172a;
    }
    .meta-box small {
      display: block;
      color: #64748b;
      font-size: 11px;
      margin-top: 2px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    th {
      background: #f8fafc;
      text-align: left;
      padding: 10px 12px;
      font-size: 11px;
      text-transform: uppercase;
      color: #475569;
      border-bottom: 1px solid #cbd5e1;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 13px;
    }
    .total-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 24px;
    }
    .total-table {
      width: 260px;
    }
    .total-table td {
      padding: 6px 12px;
      border: none;
    }
    .total-table .grand-total {
      font-size: 16px;
      font-weight: 800;
      color: #0284c7;
      border-top: 2px solid #e2e8f0;
    }
    .footer {
      border-top: 1px dashed #cbd5e1;
      padding-top: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #64748b;
    }
    .seal {
      text-align: right;
    }
    .seal-box {
      display: inline-block;
      border: 1px dashed #0284c7;
      padding: 6px 14px;
      border-radius: 8px;
      color: #0284c7;
      font-weight: 700;
      font-size: 10px;
      text-transform: uppercase;
      background: #f0f9ff;
    }
    @media print {
      body { padding: 0; }
      .receipt-container { border: none; box-shadow: none; padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="header">
      <div class="brand">
        <h1>Nestara AI</h1>
        <p>Digital Property & Rental Operating System</p>
      </div>
      <div class="receipt-badge">
        <div class="receipt-title">Rent Payment Receipt</div>
        <div class="receipt-num">${data.receiptNumber}</div>
        <div class="status-badge">${isPaid ? "Paid in Full" : "Partial Payment"}</div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-box">
        <h3>Resident Details</h3>
        <p>${data.tenantName}</p>
        ${data.tenantEmail ? `<small>Email: ${data.tenantEmail}</small>` : ""}
        ${data.tenantPhone ? `<small>Phone: ${data.tenantPhone}</small>` : ""}
      </div>
      <div class="meta-box">
        <h3>Residence Details</h3>
        <p>${data.unitName} — ${data.propertyName}</p>
        ${data.propertyAddress ? `<small>${data.propertyAddress}</small>` : ""}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>Billing Period</th>
          <th>Due Date</th>
          <th style="text-align: right;">Amount (INR)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>Monthly Residential Rent</strong>
            <div style="font-size: 11px; color: #64748b;">${data.unitName} · Regular lease installment</div>
          </td>
          <td>${data.period}</td>
          <td>${data.dueDate}</td>
          <td style="text-align: right; font-weight: 600;">₹${data.amount.toLocaleString("en-IN")}</td>
        </tr>
      </tbody>
    </table>

    <div class="total-section">
      <table class="total-table">
        <tr>
          <td>Total Charge:</td>
          <td style="text-align: right;">₹${data.amount.toLocaleString("en-IN")}</td>
        </tr>
        <tr>
          <td>Amount Settled:</td>
          <td style="text-align: right; font-weight: 700; color: #166534;">₹${data.amountPaid.toLocaleString("en-IN")}</td>
        </tr>
        ${balance > 0 ? `
        <tr>
          <td>Remaining Balance:</td>
          <td style="text-align: right; font-weight: 700; color: #dc2626;">₹${balance.toLocaleString("en-IN")}</td>
        </tr>` : ""}
        <tr class="grand-total">
          <td>Status:</td>
          <td style="text-align: right;">${isPaid ? "SETTLED" : "OPEN BALANCE"}</td>
        </tr>
      </table>
    </div>

    <div class="footer">
      <div>
        <strong>Payment Reference:</strong> ${data.paymentReference || "Direct UPI/Bank Transfer"}<br>
        <strong>Generated On:</strong> ${new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}
      </div>
      <div class="seal">
        <div class="seal-box">✓ Nestara Verified Transaction</div>
      </div>
    </div>
  </div>
  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>
  `.trim();
}

/**
 * Generates an official 11-Month Residential Tenancy Agreement.
 */
export function generateLeaseAgreementHtml(data: LeaseAgreementData): string {
  const currency = data.currency || "INR";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Residential Tenancy Agreement — ${data.unitName}</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body {
      font-family: "Times New Roman", Times, Georgia, serif;
      color: #0f172a;
      line-height: 1.6;
      font-size: 13px;
      margin: 0;
      padding: 30px;
    }
    .doc-container {
      max-width: 720px;
      margin: 0 auto;
      background: #ffffff;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 24px;
    }
    .header h1 {
      margin: 0;
      font-size: 18px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .header p {
      margin: 4px 0 0;
      font-size: 12px;
      font-style: italic;
    }
    .clause {
      margin-bottom: 16px;
      text-align: justify;
    }
    .clause-title {
      font-weight: bold;
      margin-bottom: 4px;
    }
    .parties-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 14px;
      margin-bottom: 20px;
      font-size: 12px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .terms-table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 12px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .terms-table th, .terms-table td {
      border: 1px solid #cbd5e1;
      padding: 8px 12px;
    }
    .terms-table th {
      background: #f1f5f9;
      text-align: left;
      width: 35%;
    }
    .signature-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid #cbd5e1;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 12px;
    }
    .sign-box {
      border-top: 1px solid #0f172a;
      padding-top: 8px;
    }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="doc-container">
    <div class="header">
      <h1>Residential Tenancy Agreement</h1>
      <p>Standard 11-Month Term Agreement (Karnataka Rent Control & Urban Housing Act)</p>
    </div>

    <p style="text-align: center; font-size: 12px; font-weight: bold; margin-bottom: 20px;">
      AGREEMENT REFERENCE: ${data.agreementNumber}
    </p>

    <div class="parties-box">
      <strong>THIS AGREEMENT</strong> entered into on <strong>${data.startDate}</strong> at <strong>${data.propertyCity}</strong> by and between:
      <br><br>
      <strong>1. THE LESSOR / LANDLORD:</strong> ${data.landlordName} (${data.landlordContact}), hereinafter referred to as the "OWNER" of the ONE PART.
      <br><br>
      <strong>2. THE LESSEE / TENANT:</strong> ${data.tenantName} (Phone: ${data.tenantPhone || "N/A"}, Email: ${data.tenantEmail || "N/A"}), hereinafter referred to as the "TENANT" of the OTHER PART.
    </div>

    <div class="clause">
      <div class="clause-title">1. DEMISED PREMISES:</div>
      The Owner hereby leases to the Tenant the residential property identified as <strong>${data.unitName}</strong> located at <strong>${data.propertyName}, ${data.propertyAddress}, ${data.propertyCity}</strong>, comprising <strong>${data.bedrooms} Bedroom(s), ${data.bathrooms} Bathroom(s)</strong>, with an approximate carpet area of <strong>${data.sqft ? `${data.sqft} sq.ft.` : "standard floorplan"}</strong>.
    </div>

    <table class="terms-table">
      <tr>
        <th>Tenancy Tenure</th>
        <td>11 Months commencing from <strong>${data.startDate}</strong> to <strong>${data.endDate}</strong></td>
      </tr>
      <tr>
        <th>Monthly Rent</th>
        <td><strong>₹${data.monthlyRent.toLocaleString("en-IN")} / month</strong> (Excluding individual unit electricity and water meter utilities)</td>
      </tr>
      <tr>
        <th>Rent Due Date</th>
        <td>Payable on or before the <strong>${data.rentDueDay}th day</strong> of each calendar month</td>
      </tr>
      <tr>
        <th>Security Deposit</th>
        <td><strong>₹${data.deposit.toLocaleString("en-IN")}</strong> (Refundable interest-free deposit, returnable on peaceful vacant possession)</td>
      </tr>
      <tr>
        <th>Late Fee Penalty</th>
        <td>₹${data.lateFee.toLocaleString("en-IN")} applied after standard 5-day grace period</td>
      </tr>
    </table>

    <div class="clause">
      <div class="clause-title">2. UTILITIES & STATUTORY DUES:</div>
      The Tenant shall punctually pay monthly electricity charges as per meter consumption and any applicable individual apartment amenities maintenance charges.
    </div>

    <div class="clause">
      <div class="clause-title">3. PERMITTED USE & MAINTENANCE:</div>
      The Demised Premises shall be utilized exclusively for private residential family occupancy. The Tenant shall maintain the unit in tenantable condition and promptly notify the Landlord of any major structural, plumbing, or electrical defects via the Nestara AI Resident Portal.
    </div>

    <div class="clause">
      <div class="clause-title">4. NOTICE PERIOD & TERMINATION:</div>
      Either party may terminate this agreement by tendering <strong>one (1) calendar month's written notice</strong> to the other party.
    </div>

    <div class="signature-grid">
      <div>
        <div class="sign-box">
          <strong>LANDLORD / PROPERTY MANAGER</strong><br>
          Name: ${data.landlordName}<br>
          Signature: __________________________<br>
          Date: ${data.startDate}
        </div>
      </div>
      <div>
        <div class="sign-box">
          <strong>TENANT / RESIDENT</strong><br>
          Name: ${data.tenantName}<br>
          Signature: __________________________<br>
          Date: ${data.startDate}
        </div>
      </div>
    </div>
  </div>
  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>
  `.trim();
}

/**
 * Opens a print dialog window for the generated document.
 */
export function printDocument(title: string, htmlContent: string): void {
  const printWindow = window.open("", "_blank", "width=850,height=900,menubar=no,toolbar=no,location=no,status=no");
  if (!printWindow) {
    alert("Please allow pop-ups to open and print documents.");
    return;
  }
  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
