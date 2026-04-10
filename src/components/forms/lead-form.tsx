import type { Lead } from "@/types/database";

const statuses = ["new", "contacted", "qualified", "unqualified"];

type Member = {
  user_id: string;
  role: string;
  profiles: { full_name: string | null } | Array<{ full_name: string | null }> | null;
};

function memberName(member: Member) {
  if (!member.profiles) return member.user_id.slice(0, 8);
  return Array.isArray(member.profiles)
    ? (member.profiles[0]?.full_name ?? member.user_id.slice(0, 8))
    : (member.profiles.full_name ?? member.user_id.slice(0, 8));
}

export function LeadForm({
  action,
  members,
  lead,
}: {
  action: (formData: FormData) => void;
  members: Member[];
  lead?: Lead;
}) {
  return (
    <form action={action} className="space-y-3">
      <input name="name" placeholder="Lead name" defaultValue={lead?.name} required />
      <input name="phone" placeholder="Phone" defaultValue={lead?.phone} required />
      <input name="source" placeholder="Source (WhatsApp, Instagram, referral)" defaultValue={lead?.source ?? ""} />
      <input
        name="service_interest"
        placeholder="Service interest"
        defaultValue={lead?.service_interest ?? ""}
      />
      <select name="status" defaultValue={lead?.status ?? "new"}>
        {statuses.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
      <select name="owner_user_id" defaultValue={lead?.owner_user_id ?? ""}>
        <option value="">Select owner</option>
        {members.map((member) => (
          <option key={member.user_id} value={member.user_id}>
            {memberName(member)} ({member.role})
          </option>
        ))}
      </select>
      <input type="datetime-local" name="next_follow_up_at" defaultValue={lead?.next_follow_up_at?.slice(0, 16) ?? ""} />
      <input name="urgency" placeholder="Urgency (high/medium/low)" defaultValue={lead?.urgency ?? ""} />
      <input name="budget_clue" placeholder="Budget clue" defaultValue={lead?.budget_clue ?? ""} />
      <textarea name="notes" placeholder="Notes" defaultValue={lead?.notes ?? ""} rows={4} />
      <button className="w-full bg-emerald-600 text-white">Save lead</button>
    </form>
  );
}
