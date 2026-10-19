import { describe, expect, it } from "vitest";
import { parseDashboard } from "./parse";

const body = {
  data: {
    date: "2026-10-19",
    timezone: "Asia/Kolkata",
    currency: "INR",
    patients: { registered_today: 3 },
    appointments: {
      today_total: 5,
      by_status: { booked: 2, weird: 1, completed: 3 },
      by_practitioner: [{ practitioner: { id: "d1", full_name: "Dr Khan" }, count: 4 }],
      last_7_days: [{ date: "2026-10-18", count: 2 }],
    },
    queue: { waiting: 1, in_consultation: 1, completed: 2, skipped: 0 },
    billing: {
      invoices_today: { issued: 2, draft: 1 },
      collected_today: "500.00",
      collected_by_method_today: { cash: "300.00", upi: { amount: "200.00", share: 40 } },
      collected_last_7_days: [{ date: "2026-10-18", amount: "100.00" }],
      outstanding_total: "900.00",
    },
  },
};

describe("parseDashboard", () => {
  it("reads the real summary and keeps money as text", () => {
    const d = parseDashboard(body);
    expect(d).toMatchObject({ date: "2026-10-19", timezone: "Asia/Kolkata", currency: "INR" });
    expect(d.patients).toEqual({ registeredToday: 3 });
    expect(d.appointments?.byStatus.map((s) => s.status)).toEqual(["booked", "completed", "weird"]);
    expect(d.appointments?.byPractitioner).toEqual([{ name: "Dr Khan", count: 4 }]);
    expect(d.queue).toEqual({ waiting: 1, inConsultation: 1, completed: 2, skipped: 0 });
    expect(d.billing?.collectedToday).toBe("500.00");
    expect(d.billing?.outstanding).toBe("900.00");
    expect(d.billing?.invoicesToday.map((s) => s.status)).toEqual(["draft", "issued"]);
    expect(d.billing?.byMethod).toEqual([
      { method: "cash", amount: "300.00", share: null },
      { method: "upi", amount: "200.00", share: 40 },
    ]);
  });
  it("leaves out a section the server did not send", () => {
    expect(parseDashboard(body).clinical).toBeNull();
    const none = parseDashboard(null);
    expect(none.appointments).toBeNull();
    expect(none.billing).toBeNull();
  });
});
