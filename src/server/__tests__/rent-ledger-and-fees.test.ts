import { describe, expect, it } from "vitest";

function calculateChargeBalance(charge: {
  amount: number;
  amount_paid: number;
  due_date: string;
  status: string;
  late_fee?: number | null;
}, referenceDate: string = "2026-11-15"): {
  base_balance: number;
  is_past_due: boolean;
  applied_late_fee: number;
  effective_total_due: number;
  derived_status: string;
} {
  const base_balance = Math.max(0, charge.amount - charge.amount_paid);
  const is_past_due =
    charge.status === "overdue" ||
    (charge.status !== "paid" && charge.status !== "waived" && charge.due_date < referenceDate && base_balance > 0);

  const configuredLateFee = charge.late_fee ?? 500;
  const applied_late_fee = is_past_due ? configuredLateFee : 0;
  const effective_total_due = base_balance + applied_late_fee;

  let derived_status = charge.status;
  if (base_balance === 0 && charge.amount > 0) {
    derived_status = "paid";
  } else if (charge.amount_paid > 0 && base_balance > 0) {
    derived_status = is_past_due ? "overdue" : "partial";
  } else if (is_past_due) {
    derived_status = "overdue";
  }

  return {
    base_balance,
    is_past_due,
    applied_late_fee,
    effective_total_due,
    derived_status,
  };
}

function serializeRentLedgerCsv(charges: Array<{
  period: string;
  id: number;
  property_name: string;
  unit_name: string;
  tenant_name: string;
  due_date: string;
  amount: number;
  amount_paid: number;
  late_fee?: number;
  status: string;
}>): string {
  const headers = [
    "Period",
    "Charge ID",
    "Property Name",
    "Unit Name",
    "Tenant Name",
    "Due Date",
    "Rent Amount",
    "Amount Paid",
    "Base Balance",
    "Late Fee Penalty",
    "Total Due",
    "Status",
  ];

  const rows = charges.map((c) => {
    const baseBalance = Math.max(0, c.amount - c.amount_paid);
    const lateFee = c.late_fee ?? 0;
    const totalDue = baseBalance + lateFee;
    return [
      `"${c.period}"`,
      `"${c.id}"`,
      `"${c.property_name.replace(/"/g, '""')}"`,
      `"${c.unit_name.replace(/"/g, '""')}"`,
      `"${c.tenant_name.replace(/"/g, '""')}"`,
      `"${c.due_date}"`,
      `"${c.amount}"`,
      `"${c.amount_paid}"`,
      `"${baseBalance}"`,
      `"${lateFee}"`,
      `"${totalDue}"`,
      `"${c.status.toUpperCase()}"`,
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

describe("Rent Ledger, Late Fee Calculation & Financial Reconciliation", () => {
  it("settles on-time payment in full with zero balance and zero penalty", () => {
    const charge = {
      amount: 35000,
      amount_paid: 35000,
      due_date: "2026-11-05",
      status: "paid",
      late_fee: 500,
    };
    const res = calculateChargeBalance(charge, "2026-11-04");
    expect(res.base_balance).toBe(0);
    expect(res.applied_late_fee).toBe(0);
    expect(res.effective_total_due).toBe(0);
    expect(res.derived_status).toBe("paid");
  });

  it("calculates partial payment balance before due date", () => {
    const charge = {
      amount: 40000,
      amount_paid: 25000,
      due_date: "2026-11-05",
      status: "partial",
      late_fee: 500,
    };
    const res = calculateChargeBalance(charge, "2026-11-03"); // Before due date
    expect(res.base_balance).toBe(15000);
    expect(res.is_past_due).toBe(false);
    expect(res.applied_late_fee).toBe(0);
    expect(res.effective_total_due).toBe(15000);
    expect(res.derived_status).toBe("partial");
  });

  it("applies late fee penalty when charge becomes overdue past due date", () => {
    const charge = {
      amount: 35000,
      amount_paid: 0,
      due_date: "2026-11-01",
      status: "open",
      late_fee: 750, // Custom lease late fee
    };
    const res = calculateChargeBalance(charge, "2026-11-10"); // Past due!
    expect(res.base_balance).toBe(35000);
    expect(res.is_past_due).toBe(true);
    expect(res.applied_late_fee).toBe(750);
    expect(res.effective_total_due).toBe(35750);
    expect(res.derived_status).toBe("overdue");
  });

  it("applies default statutory late fee (₹500) if lease has no explicit fee set", () => {
    const charge = {
      amount: 25000,
      amount_paid: 0,
      due_date: "2026-10-01",
      status: "overdue",
      late_fee: null,
    };
    const res = calculateChargeBalance(charge, "2026-11-01");
    expect(res.applied_late_fee).toBe(500);
    expect(res.effective_total_due).toBe(25500);
  });

  it("never produces negative balances when payments exceed charge amount", () => {
    const charge = {
      amount: 20000,
      amount_paid: 22000, // Overpayment buffer
      due_date: "2026-11-01",
      status: "paid",
    };
    const res = calculateChargeBalance(charge, "2026-11-05");
    expect(res.base_balance).toBe(0);
    expect(res.effective_total_due).toBe(0);
    expect(res.derived_status).toBe("paid");
  });

  it("serializes clean audit-grade CSV with escaped quotes and commas", () => {
    const charges = [
      {
        period: "2026-11",
        id: 101,
        property_name: "Greenwood Heights, Bangalore",
        unit_name: "Suite 4B",
        tenant_name: "Sharma, Aarav",
        due_date: "2026-11-05",
        amount: 35000,
        amount_paid: 35000,
        late_fee: 0,
        status: "paid",
      },
      {
        period: "2026-11",
        id: 102,
        property_name: 'The "Hive" Suites',
        unit_name: "Studio 1",
        tenant_name: "Patel, Priya",
        due_date: "2026-11-01",
        amount: 18500,
        amount_paid: 0,
        late_fee: 500,
        status: "overdue",
      },
    ];

    const csv = serializeRentLedgerCsv(charges);
    const lines = csv.split("\n");

    expect(lines.length).toBe(3); // Header + 2 data rows
    expect(lines[0]).toContain("Period,Charge ID,Property Name");
    expect(lines[1]).toContain('"2026-11","101","Greenwood Heights, Bangalore","Suite 4B","Sharma, Aarav"');
    expect(lines[2]).toContain('""Hive""'); // Properly escaped double quotes
    expect(lines[2]).toContain('"19000"'); // 18500 + 500 total due
  });
});
