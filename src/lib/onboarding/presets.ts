export type WorkspacePresetId = "solar_cctv_installers" | "printing_businesses" | "design_agency_providers";

export type WorkspacePreset = {
  id: WorkspacePresetId;
  label: string;
  description: string;
  pipelineStages: Array<{ name: string; isClosed?: boolean }>;
  quoteDefaultTerms: string;
  invoiceDefaultTerms: string;
  taskPlaceholders: string[];
  reminderPlaceholders: string[];
};

export const WORKSPACE_PRESETS: WorkspacePreset[] = [
  {
    id: "solar_cctv_installers",
    label: "Solar / CCTV installers",
    description: "Field-installation sales cycle with site survey, technical proposal, install, and handover.",
    pipelineStages: [
      { name: "New Enquiry" },
      { name: "Site Survey Scheduled" },
      { name: "Technical Proposal Sent" },
      { name: "Negotiation" },
      { name: "Deposit Received" },
      { name: "Installation Scheduled" },
      { name: "Won", isClosed: true },
      { name: "Lost", isClosed: true },
    ],
    quoteDefaultTerms:
      "Quote valid for 14 days. Installation slot is confirmed after deposit. Equipment warranty and workmanship terms apply per project scope.",
    invoiceDefaultTerms:
      "Payment terms: 70% deposit to mobilize, 30% balance on completion/handover unless otherwise stated in contract.",
    taskPlaceholders: [
      "Confirm site survey date with customer",
      "Prepare bill of quantities and load plan",
      "Assign installation team and checklist",
    ],
    reminderPlaceholders: [
      "Follow up proposal 48 hours after sending",
      "Remind customer of upcoming installation date",
      "Check balance payment within 24 hours of handover",
    ],
  },
  {
    id: "printing_businesses",
    label: "Printing businesses",
    description: "Fast-turnaround production cycle from artwork to proof approval and delivery.",
    pipelineStages: [
      { name: "New Request" },
      { name: "Artwork Received" },
      { name: "Quote Sent" },
      { name: "Proof Approved" },
      { name: "In Production" },
      { name: "Ready for Pickup/Dispatch" },
      { name: "Won", isClosed: true },
      { name: "Lost", isClosed: true },
    ],
    quoteDefaultTerms:
      "Quote valid for 7 days. Final pricing may vary for source file edits, urgent turnaround, or material changes approved by client.",
    invoiceDefaultTerms:
      "Payment terms: 100% payment before dispatch unless account credit terms are approved in writing.",
    taskPlaceholders: [
      "Verify print-ready file specs (size, bleed, color mode)",
      "Send proof for approval before full run",
      "Book dispatch and share tracking details",
    ],
    reminderPlaceholders: [
      "Follow up pending artwork/proof approval",
      "Remind customer to confirm pickup date",
      "Follow up unpaid balance before dispatch",
    ],
  },
  {
    id: "design_agency_providers",
    label: "Design / agency providers",
    description: "Consultative creative workflow from discovery to concept, revisions, and final delivery.",
    pipelineStages: [
      { name: "New Lead" },
      { name: "Discovery Call" },
      { name: "Proposal Sent" },
      { name: "Contracting" },
      { name: "Project Kickoff" },
      { name: "Won", isClosed: true },
      { name: "Lost", isClosed: true },
    ],
    quoteDefaultTerms:
      "Quote covers listed scope only. Additional revisions, out-of-scope requests, and third-party costs are billed separately.",
    invoiceDefaultTerms:
      "Payment terms: 50% upfront and 50% before final handoff. Monthly retainer invoices are due within 7 days.",
    taskPlaceholders: [
      "Run discovery questionnaire with stakeholders",
      "Create first concept presentation deck",
      "Capture revision requests and approval notes",
    ],
    reminderPlaceholders: [
      "Follow up proposal after discovery call",
      "Send revision deadline reminder to client",
      "Remind client on milestone invoice due date",
    ],
  },
];

export function getWorkspacePresetById(presetId: string | null | undefined) {
  return WORKSPACE_PRESETS.find((preset) => preset.id === presetId) ?? null;
}
