"use client";

import { buildWhatsAppShareUrl } from "@/lib/whatsapp";

export function WhatsAppShareCard({ title, message, phone, fallbackLabel, logPath }: { title: string; message: string; phone?: string | null; fallbackLabel?: string; logPath?: string; }) {
  const url = buildWhatsAppShareUrl(message, phone);
  const copyMessage = `${message}`;

  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-3">
      <p className="text-sm font-semibold text-green-900">{title}</p>
      <textarea readOnly value={copyMessage} rows={4} className="mt-2 text-xs" />
      <div className="mt-2 grid gap-2 md:grid-cols-2">
        <a href={logPath ? `/share/whatsapp?target=${encodeURIComponent(url)}&log=${encodeURIComponent(logPath)}` : url} target="_blank" className="rounded-md bg-green-700 px-3 py-2 text-center text-sm font-medium text-white">Share on WhatsApp</a>
        <button type="button" onClick={() => navigator.clipboard.writeText(copyMessage)} className="border border-slate-300">{fallbackLabel ?? "Copy message"}</button>
      </div>
    </div>
  );
}
