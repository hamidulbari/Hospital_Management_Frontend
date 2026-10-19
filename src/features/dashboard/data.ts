import { addDays, weekdayName } from "@/lib/calendar";
import type { DashboardData } from "./types";

/**
 * SAMPLE DATA for the design. Nothing here comes from the hospital.
 *
 * To make it real, replace the body of loadDashboardData() and keep the return type:
 *  - appointments today / by status: GET /appointments?date=<today>&status=<s>&per_page=1 (read meta.total). Audited read.
 *  - queue: GET /queue (audited read)
 *  - collection, invoices, weekly trend, doctor load: need a backend summary endpoint.
 */
export async function loadDashboardData(today: string): Promise<DashboardData> {
  const weeklyValues = [18, 24, 21, 27, 19, 12, 22];
  const weekly = weeklyValues.map((value, index) => {
    const offset = index - (weeklyValues.length - 1);
    return {
      label: weekdayName(addDays(today, offset)).slice(0, 3),
      value,
      highlight: index === weeklyValues.length - 1,
    };
  });

  return {
    isSample: true,
    kpis: { appointmentsToday: 22, inQueue: 6, completedToday: 9, collectedToday: "48250.00" },
    statusBreakdown: [
      { label: "Booked", value: 7 },
      { label: "Checked in", value: 4 },
      { label: "In consultation", value: 2 },
      { label: "Completed", value: 9 },
      { label: "Cancelled", value: 1 },
      { label: "No-show", value: 1 },
    ],
    weekly,
    upcoming: [
      { time: "10:30", patient: "Sample patient 1", doctor: "Dr Sample A", type: "Consultation" },
      { time: "10:45", patient: "Sample patient 2", doctor: "Dr Sample B", type: "Follow-up" },
      { time: "11:00", patient: "Sample patient 3", doctor: "Dr Sample A", type: "Consultation" },
      { time: "11:15", patient: "Sample patient 4", doctor: "Dr Sample C", type: "Procedure" },
      { time: "11:30", patient: "Sample patient 5", doctor: "Dr Sample B", type: "Consultation" },
    ],
    queue: [
      { token: "14", patient: "Sample patient 6", status: "In consultation" },
      { token: "15", patient: "Sample patient 7", status: "Waiting" },
      { token: "16", patient: "Sample patient 8", status: "Waiting" },
      { token: "17", patient: "Sample patient 9", status: "Waiting" },
    ],
    doctorLoad: [
      { label: "Dr Sample A", value: 9 },
      { label: "Dr Sample B", value: 7 },
      { label: "Dr Sample C", value: 4 },
      { label: "Dr Sample D", value: 2 },
    ],
    collectedByMethod: [
      { label: "Cash", amount: "18250.00", share: 38 },
      { label: "UPI", amount: "21000.00", share: 44 },
      { label: "Card", amount: "9000.00", share: 18 },
    ],
    invoiceCounts: [
      { label: "Issued", value: 14 },
      { label: "Partially paid", value: 3 },
      { label: "Paid", value: 11 },
      { label: "Cancelled", value: 1 },
    ],
  };
}