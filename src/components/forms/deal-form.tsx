import type { PipelineStage } from "@/types/database";

type Item = { id: string; name?: string | null; business_name?: string | null };
type Member = { user_id: string; role: string; profiles: { full_name: string | null } | Array<{ full_name: string | null }> | null };

function memberName(member: Member) {
  if (!member.profiles) return member.user_id.slice(0, 8);
  return Array.isArray(member.profiles)
    ? (member.profiles[0]?.full_name ?? member.user_id.slice(0, 8))
    : (member.profiles.full_name ?? member.user_id.slice(0, 8));
}

type DealValues = {
  title?: string;
  lead_id?: string | null;
  client_id?: string | null;
  stage_id?: string;
  amount?: number;
  expected_close_date?: string | null;
  owner_user_id?: string | null;
  notes?: string | null;
};

export function DealForm({
  action,
  stages,
  leads,
  clients,
  members,
  deal,
}: {
  action: (formData: FormData) => void;
  stages: PipelineStage[];
  leads: Item[];
  clients: Item[];
  members: Member[];
  deal?: DealValues;
}) {
  return (
    <form action={action} className="space-y-3">
      <input name="title" placeholder="Deal title" defaultValue={deal?.title} required />
      <select name="lead_id" defaultValue={deal?.lead_id ?? ""}>
        <option value="">No linked lead</option>
        {leads.map((lead) => (
          <option key={lead.id} value={lead.id}>{lead.name}</option>
        ))}
      </select>
      <select name="client_id" defaultValue={deal?.client_id ?? ""}>
        <option value="">No linked client</option>
        {clients.map((client) => (
          <option key={client.id} value={client.id}>{client.business_name}</option>
        ))}
      </select>
      <select name="stage_id" defaultValue={deal?.stage_id ?? stages[0]?.id}>
        {stages.map((stage) => (
          <option key={stage.id} value={stage.id}>{stage.name}</option>
        ))}
      </select>
      <input type="number" step="0.01" min="0" name="amount" placeholder="Amount (NGN)" defaultValue={deal?.amount ?? 0} required />
      <input type="date" name="expected_close_date" defaultValue={deal?.expected_close_date?.slice(0, 10) ?? ""} />
      <select name="owner_user_id" defaultValue={deal?.owner_user_id ?? ""}>
        <option value="">Select owner</option>
        {members.map((member) => (
          <option key={member.user_id} value={member.user_id}>
            {memberName(member)} ({member.role})
          </option>
        ))}
      </select>
      <textarea name="notes" placeholder="Notes" rows={4} defaultValue={deal?.notes ?? ""} />
      <button className="w-full bg-emerald-600 text-white">Save deal</button>
    </form>
  );
}
