"use server";

import { requireWorkspace } from "@/lib/rbac/permissions";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/db/activity";
import {
  parseCsvContent,
  validateRequiredHeaders,
  validateRow,
  type ImportEntity,
  type ImportRowError,
} from "@/lib/imports/parser";

type OwnerMaps = {
  memberIds: Set<string>;
  emailToUserId: Map<string, string>;
};

export type ImportActionState = {
  entity: ImportEntity;
  dryRun: boolean;
  submitted: boolean;
  acceptedCount: number;
  rejectedCount: number;
  insertedCount: number;
  missingHeaders: string[];
  rowErrors: ImportRowError[];
  message: string;
};

const INITIAL_LEADS_STATE: ImportActionState = {
  entity: "leads",
  dryRun: true,
  submitted: false,
  acceptedCount: 0,
  rejectedCount: 0,
  insertedCount: 0,
  missingHeaders: [],
  rowErrors: [],
  message: "",
};

const INITIAL_CLIENTS_STATE: ImportActionState = {
  ...INITIAL_LEADS_STATE,
  entity: "clients",
};

async function buildOwnerMaps(workspaceId: string) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: members, error: membersError } = await supabase
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId);

  if (membersError) throw membersError;

  const memberIds = new Set((members ?? []).map((member) => String(member.user_id)));
  const emailToUserId = new Map<string, string>();

  await Promise.all(
    [...memberIds].map(async (memberId) => {
      const { data, error } = await admin.auth.admin.getUserById(memberId);
      if (error) return;
      const email = String(data.user?.email ?? "").trim().toLowerCase();
      if (email) emailToUserId.set(email, memberId);
    }),
  );

  return { memberIds, emailToUserId } satisfies OwnerMaps;
}

function resolveLeadOwnerId(row: Record<string, string>, ownerMaps: OwnerMaps, defaultOwnerId: string) {
  const ownerUserId = String(row.owner_user_id ?? "").trim();
  if (ownerUserId && ownerMaps.memberIds.has(ownerUserId)) {
    return ownerUserId;
  }

  const ownerEmail = String(row.owner_email ?? "").trim().toLowerCase();
  if (ownerEmail && ownerMaps.emailToUserId.has(ownerEmail)) {
    return ownerMaps.emailToUserId.get(ownerEmail) ?? defaultOwnerId;
  }

  return defaultOwnerId;
}

async function runImport(entity: ImportEntity, formData: FormData): Promise<ImportActionState> {
  const { workspace, user } = await requireWorkspace("staff");
  const supabase = await createClient();

  const csvText = String(formData.get("csv_text") ?? "").trim();
  const dryRun = String(formData.get("dry_run") ?? "preview") === "preview";

  if (!csvText) {
    return {
      entity,
      dryRun,
      submitted: true,
      acceptedCount: 0,
      rejectedCount: 0,
      insertedCount: 0,
      missingHeaders: [],
      rowErrors: [],
      message: "Paste CSV content or choose a CSV file first.",
    };
  }

  const parsed = parseCsvContent(csvText);
  const headerValidation = validateRequiredHeaders(entity, parsed.headers);

  if (!headerValidation.valid) {
    return {
      entity,
      dryRun,
      submitted: true,
      acceptedCount: 0,
      rejectedCount: parsed.rows.length,
      insertedCount: 0,
      missingHeaders: headerValidation.missing,
      rowErrors: [],
      message: "Missing required headers.",
    };
  }

  const rowErrors: ImportRowError[] = [];
  const acceptedRows: Record<string, string>[] = [];

  parsed.rows.forEach((row, index) => {
    const validationError = validateRow(entity, row, index + 2);
    if (validationError) {
      rowErrors.push(validationError);
      return;
    }
    acceptedRows.push(row);
  });

  await logActivity({
    workspaceId: workspace.id,
    actorUserId: user.id,
    entityType: "workspace",
    entityId: workspace.id,
    type: "import.started",
    description: `${entity} import started (${dryRun ? "preview" : "commit"})`,
    metadata: {
      entity,
      dry_run: dryRun,
      total_rows: parsed.rows.length,
      accepted_rows: acceptedRows.length,
      rejected_rows: rowErrors.length,
      missing_headers: headerValidation.missing,
    },
  });

  let insertedCount = 0;

  if (!dryRun && acceptedRows.length > 0) {
    if (entity === "leads") {
      const ownerMaps = await buildOwnerMaps(workspace.id);
      const leadsPayload = acceptedRows.map((row) => ({
        workspace_id: workspace.id,
        name: row.name,
        phone: row.phone,
        source: row.source || null,
        service_interest: row.service_interest || null,
        status: row.status || "new",
        owner_user_id: resolveLeadOwnerId(row, ownerMaps, user.id),
        notes: row.notes || null,
      }));

      const { error } = await supabase.from("leads").insert(leadsPayload);
      if (error) {
        rowErrors.push({
          rowNumber: 0,
          messages: [error.message],
          row: {},
        });
      } else {
        insertedCount = leadsPayload.length;
      }
    } else {
      const clientsPayload = acceptedRows.map((row) => ({
        workspace_id: workspace.id,
        business_name: row.business_name,
        primary_contact: row.primary_contact || null,
        phone: row.phone || null,
        email: row.email || null,
        location: row.location || null,
        notes: row.notes || null,
      }));

      const { error } = await supabase.from("clients").insert(clientsPayload);
      if (error) {
        rowErrors.push({
          rowNumber: 0,
          messages: [error.message],
          row: {},
        });
      } else {
        insertedCount = clientsPayload.length;
      }
    }
  }

  await logActivity({
    workspaceId: workspace.id,
    actorUserId: user.id,
    entityType: "workspace",
    entityId: workspace.id,
    type: "import.completed",
    description: `${entity} import completed (${dryRun ? "preview" : "commit"})`,
    metadata: {
      entity,
      dry_run: dryRun,
      total_rows: parsed.rows.length,
      accepted_rows: acceptedRows.length,
      rejected_rows: rowErrors.length,
      inserted_rows: insertedCount,
      missing_headers: headerValidation.missing,
      error_summary: rowErrors.slice(0, 10).map((error) => ({
        row: error.rowNumber,
        messages: error.messages,
      })),
    },
  });

  return {
    entity,
    dryRun,
    submitted: true,
    acceptedCount: acceptedRows.length,
    rejectedCount: rowErrors.length,
    insertedCount,
    missingHeaders: headerValidation.missing,
    rowErrors,
    message: dryRun
      ? "Preview ready. Review accepted/rejected rows before importing."
      : `Import completed. ${insertedCount} ${entity} inserted.`,
  };
}

export async function previewLeadsImportAction(_prev: ImportActionState, formData: FormData) {
  return runImport("leads", formData);
}

export async function previewClientsImportAction(_prev: ImportActionState, formData: FormData) {
  return runImport("clients", formData);
}

export { INITIAL_LEADS_STATE, INITIAL_CLIENTS_STATE };
