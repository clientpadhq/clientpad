"use client";

import { useState } from "react";

export function WhatsAppMessagePanel({
  workspaceId,
  entityType,
  entityId,
  recipientPhone,
}: {
  workspaceId: string;
  entityType: string;
  entityId: string;
  recipientPhone?: string | null;
}) {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSend() {
    if (!message.trim()) return;
    if (!recipientPhone) {
      setErrorMsg("No phone number available for this contact");
      setStatus("error");
      return;
    }

    setStatus("sending");
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipientPhone,
          message: message.trim(),
          workspace_id: workspaceId,
          linked_entity_type: entityType,
          linked_entity_id: entityId,
        }),
      });

      const data = await res.json();
      if (data.error) {
        setErrorMsg(data.error);
        setStatus("error");
      } else {
        setMessage("");
        setStatus("success");
        setTimeout(() => setStatus("idle"), 2000);
      }
    } catch (err) {
      setErrorMsg("Failed to send message");
      setStatus("error");
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">Send WhatsApp Message</h3>

      {status === "error" && (
        <div className="mb-3 rounded-md bg-red-50 p-2 text-xs text-red-700">{errorMsg}</div>
      )}

      {status === "success" && (
        <div className="mb-3 rounded-md bg-green-50 p-2 text-xs text-green-700">Message sent successfully</div>
      )}

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message..."
        rows={4}
        className="w-full rounded-md border border-slate-300 p-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        disabled={status === "sending"}
      />

      <div className="mt-3 flex justify-end">
        <button
          onClick={handleSend}
          disabled={!message.trim() || !recipientPhone || status === "sending"}
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:bg-slate-300"
        >
          {status === "sending" ? "Sending..." : "Send via WhatsApp"}
        </button>
      </div>
    </div>
  );
}