"use client";

interface MessageItem {
  id: string;
  content: string;
  direction: "inbound" | "outbound";
  status: string;
  created_at: string;
}

export function WhatsAppMessageHistory({ messages }: { messages: MessageItem[] }) {
  if (!messages.length) {
    return (
      <div className="rounded-1g border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
        No messages yet
      </div>
    );
  }

  return (
    <div className="rounded-1g border border-slate-200 bg-white">
      <div className="max-h-64 space-y-3 overflow-y-auto p-4">
        {messages.map((msg) => (
          <div key={msg.id} className="flex flex-col gap-1">
            <div className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}>
              <span
                className={`max-w-xs rounded-1g px-3 py-2 text-sm ${
                  msg.direction === "outbound"
                    ? "bg-green-100 text-slate-900"
                    : "bg-slate-100 text-slate-900"
                }`}
              >
                {msg.content}
              </span>
            </div>
            <div className={`flex gap-2 text-xs text-slate-400 ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}>
              <span>{new Date(msg.created_at).toLocaleString()}</span>
              {msg.direction === "outbound" && (
                <span className="capitalize">({msg.status})</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}