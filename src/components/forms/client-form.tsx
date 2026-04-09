import type { Client } from "@/types/database";

export function ClientForm({
  action,
  client,
}: {
  action: (formData: FormData) => void;
  client?: Client;
}) {
  return (
    <form action={action} className="space-y-3">
      <input name="business_name" placeholder="Client or business name" defaultValue={client?.business_name} required />
      <input name="primary_contact" placeholder="Primary contact" defaultValue={client?.primary_contact ?? ""} />
      <input name="phone" placeholder="Phone" defaultValue={client?.phone ?? ""} />
      <input type="email" name="email" placeholder="Email" defaultValue={client?.email ?? ""} />
      <input name="location" placeholder="Location" defaultValue={client?.location ?? ""} />
      <textarea name="notes" placeholder="Notes" defaultValue={client?.notes ?? ""} rows={4} />
      <button className="w-full bg-emerald-600 text-white">Save client</button>
    </form>
  );
}
