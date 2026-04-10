import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/db/activity";
import { requireWorkspace } from "@/lib/rbac/permissions";
import { buildCsv, csvResponse } from "@/lib/exports/csv";

type ExportRecordType = "leads" | "clients" | "deals" | "invoices";

function isExportRecordType(value: string): value is ExportRecordType {
  return value === "leads" || value === "clients" || value === "deals" || value === "invoices";
}

function safeFilenameDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ recordType: string }> },
) {
  const { recordType } = await params;
  if (!isExportRecordType(recordType)) {
    return new Response("Unsupported export type.", { status: 404 });
  }

  const { workspace, user } = await requireWorkspace("admin");
  const supabase = await createClient();
  const url = new URL(request.url);
  const search = url.searchParams;

  const createdFrom = search.get("created_from")?.trim();
  const createdTo = search.get("created_to")?.trim();

  let columns: string[] = [];
  let rows: Record<string, unknown>[] = [];

  if (recordType === "leads") {
    let query = supabase
      .from("leads")
      .select("id,name,phone,source,service_interest,status,owner_user_id,next_follow_up_at,urgency,budget_clue,created_at,updated_at")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false });

    const status = search.get("status")?.trim();
    const ownerUserId = search.get("owner_user_id")?.trim();
    const source = search.get("source")?.trim();

    if (createdFrom) query = query.gte("created_at", createdFrom);
    if (createdTo) query = query.lte("created_at", createdTo);
    if (status) query = query.eq("status", status);
    if (ownerUserId) query = query.eq("owner_user_id", ownerUserId);
    if (source) query = query.ilike("source", `%${source}%`);

    const { data, error } = await query;
    if (error) throw error;

    columns = [
      "id",
      "name",
      "phone",
      "source",
      "service_interest",
      "status",
      "owner_user_id",
      "next_follow_up_at",
      "urgency",
      "budget_clue",
      "created_at",
      "updated_at",
    ];
    rows = (data ?? []) as Record<string, unknown>[];
  }

  if (recordType === "clients") {
    let query = supabase
      .from("clients")
      .select("id,business_name,primary_contact,phone,email,location,notes,created_at,updated_at")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false });

    const q = search.get("q")?.trim();
    if (createdFrom) query = query.gte("created_at", createdFrom);
    if (createdTo) query = query.lte("created_at", createdTo);
    if (q) {
      query = query.or(`business_name.ilike.%${q}%,primary_contact.ilike.%${q}%,email.ilike.%${q}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    columns = ["id", "business_name", "primary_contact", "phone", "email", "location", "notes", "created_at", "updated_at"];
    rows = (data ?? []) as Record<string, unknown>[];
  }

  if (recordType === "deals") {
    let query = supabase
      .from("deals")
      .select("id,title,lead_id,client_id,stage_id,amount,expected_close_date,owner_user_id,notes,created_at,updated_at")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false });

    const stageId = search.get("stage_id")?.trim();
    const ownerUserId = search.get("owner_user_id")?.trim();
    const clientId = search.get("client_id")?.trim();
    const minAmount = search.get("min_amount")?.trim();
    const maxAmount = search.get("max_amount")?.trim();

    if (createdFrom) query = query.gte("created_at", createdFrom);
    if (createdTo) query = query.lte("created_at", createdTo);
    if (stageId) query = query.eq("stage_id", stageId);
    if (ownerUserId) query = query.eq("owner_user_id", ownerUserId);
    if (clientId) query = query.eq("client_id", clientId);
    if (minAmount) query = query.gte("amount", Number(minAmount));
    if (maxAmount) query = query.lte("amount", Number(maxAmount));

    const { data, error } = await query;
    if (error) throw error;

    columns = [
      "id",
      "title",
      "lead_id",
      "client_id",
      "stage_id",
      "amount",
      "expected_close_date",
      "owner_user_id",
      "notes",
      "created_at",
      "updated_at",
    ];
    rows = (data ?? []) as Record<string, unknown>[];
  }

  if (recordType === "invoices") {
    let query = supabase
      .from("invoices")
      .select("id,invoice_number,quote_id,deal_id,client_id,status,issue_date,due_date,total_amount,paid_amount,balance_amount,flutterwave_payment_link,created_at,updated_at")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false });

    const status = search.get("status")?.trim();
    const clientId = search.get("client_id")?.trim();
    const dealId = search.get("deal_id")?.trim();
    const issueFrom = search.get("issue_from")?.trim();
    const issueTo = search.get("issue_to")?.trim();

    if (createdFrom) query = query.gte("created_at", createdFrom);
    if (createdTo) query = query.lte("created_at", createdTo);
    if (status) query = query.eq("status", status);
    if (clientId) query = query.eq("client_id", clientId);
    if (dealId) query = query.eq("deal_id", dealId);
    if (issueFrom) query = query.gte("issue_date", issueFrom);
    if (issueTo) query = query.lte("issue_date", issueTo);

    const { data, error } = await query;
    if (error) throw error;

    columns = [
      "id",
      "invoice_number",
      "quote_id",
      "deal_id",
      "client_id",
      "status",
      "issue_date",
      "due_date",
      "total_amount",
      "paid_amount",
      "balance_amount",
      "flutterwave_payment_link",
      "created_at",
      "updated_at",
    ];
    rows = (data ?? []) as Record<string, unknown>[];
  }

  await logActivity({
    workspaceId: workspace.id,
    actorUserId: user.id,
    entityType: "workspace",
    entityId: workspace.id,
    type: "export.triggered",
    description: `CSV export triggered for ${recordType}`,
    metadata: {
      record_type: recordType,
      filters: Object.fromEntries(search.entries()),
      row_count: rows.length,
    },
  });

  const csv = buildCsv(columns, rows);
  return csvResponse(`${recordType}-${safeFilenameDate()}.csv`, csv);
}
