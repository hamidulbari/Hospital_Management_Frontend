export type Count = { label: string; value: number };

export type DashboardData = {
  /** true while the numbers are made up for the design. The screen shows a "Sample data" label. */
  isSample: boolean;
  kpis: {
    appointmentsToday: number;
    inQueue: number;
    completedToday: number;
    /** Money is always a string with two decimals. */
    collectedToday: string;
  };
  statusBreakdown: Count[];
  weekly: { label: string; value: number; highlight?: boolean }[];
  upcoming: { time: string; patient: string; doctor: string; type: string }[];
  queue: { token: string; patient: string; status: string }[];
  doctorLoad: Count[];
  /** share = percent of the day's collection (0 to 100), worked out by the server. */
  collectedByMethod: { label: string; amount: string; share: number }[];
  invoiceCounts: Count[];
};