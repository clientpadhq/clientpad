"use client";

import { useActionState } from "react";
import {
  INITIAL_CLIENTS_STATE,
  INITIAL_LEADS_STATE,
  previewClientsImportAction,
  previewLeadsImportAction,
} from "@/lib/actions/imports";

function ImportResult({
  title,
  state,
}: {
  title: string;
  state: {
    submitted: boolean;
    message: string;
    acceptedCount: number;
    rejectedCount: number;
    insertedCount: number;
    missingHeaders: string[];
    rowErrors: Array<{ rowNumber: number; messages: string[] }>;
  };
}) {
  if (!state.submitted) return null;

  return (
    <div className="mt-3 rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
      <p className="font-semibold">{title} result</p>
      <p className="mt-1">{state.message}</p>
      <p className="mt-1">
        Accepted: <span className="font-semibold">{state.acceptedCount}</span> • Rejected:{" "}
        <span className="font-semibold">{state.rejectedCount}</span> • Inserted:{" "}
        <span className="font-semibold">{state.insertedCount}</span>
      </p>
      {state.missingHeaders.length > 0 ? <p className="mt-1">Missing headers: {state.missingHeaders.join(", ")}</p> : null}
      {state.rowErrors.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1 pl-4">
          {state.rowErrors.slice(0, 8).map((error, index) => (
            <li key={`${error.rowNumber}-${index}`}>
              Row {error.rowNumber}: {error.messages.join("; ")}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function CsvImportForm({
  label,
  action,
  state,
  templateHref,
  templateName,
}: {
  label: string;
  action: (payload: FormData) => void;
  state: {
    submitted: boolean;
    message: string;
    acceptedCount: number;
    rejectedCount: number;
    insertedCount: number;
    missingHeaders: string[];
    rowErrors: Array<{ rowNumber: number; messages: string[] }>;
  };
  templateHref: string;
  templateName: string;
}) {
  return (
    <form action={action} className="space-y-2 rounded border border-slate-200 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <a href={templateHref} download className="text-xs text-emerald-700 underline">
          Download {templateName}
        </a>
      </div>
      <input
        type="file"
        accept=".csv,text/csv"
        onChange={async (event) => {
          const file = event.currentTarget.files?.[0];
          if (!file) return;
          const text = await file.text();
          const form = event.currentTarget.form;
          const textArea = form?.elements.namedItem("csv_text") as HTMLTextAreaElement | null;
          if (textArea) {
            textArea.value = text;
          }
        }}
      />
      <textarea name="csv_text" rows={8} placeholder="Paste CSV content here" required />
      <div className="flex flex-wrap gap-2">
        <button name="dry_run" value="preview" className="border border-slate-300 bg-white px-3 py-1 text-sm">
          Preview (dry-run)
        </button>
        <button name="dry_run" value="commit" className="bg-emerald-700 px-3 py-1 text-sm text-white">
          Import valid rows
        </button>
      </div>
      <ImportResult title={label} state={state} />
    </form>
  );
}

export function ImportCsvCard() {
  const [leadState, leadsAction] = useActionState(previewLeadsImportAction, INITIAL_LEADS_STATE);
  const [clientState, clientsAction] = useActionState(previewClientsImportAction, INITIAL_CLIENTS_STATE);

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Import leads and clients with CSV. Preview validates required headers and rows before any write.
      </p>
      <CsvImportForm
        label="Leads CSV"
        action={leadsAction}
        state={leadState}
        templateHref="/templates/leads-import-template.csv"
        templateName="leads template"
      />
      <CsvImportForm
        label="Clients CSV"
        action={clientsAction}
        state={clientState}
        templateHref="/templates/clients-import-template.csv"
        templateName="clients template"
      />
    </div>
  );
}
