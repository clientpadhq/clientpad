import { generateAIDraftAction } from "@/lib/actions/ai";

export function AIGenerateCard({
  title,
  description,
  generationType,
  entityType,
  entityId,
  context,
  returnPath,
}: {
  title: string;
  description: string;
  generationType: string;
  entityType: string;
  entityId: string;
  context: Record<string, unknown>;
  returnPath: string;
}) {
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
      <p className="text-sm font-semibold text-emerald-900">{title}</p>
      <p className="mt-1 text-xs text-emerald-800">{description}</p>
      <form action={generateAIDraftAction} className="mt-2 space-y-2">
        <input type="hidden" name="generation_type" value={generationType} />
        <input type="hidden" name="entity_type" value={entityType} />
        <input type="hidden" name="entity_id" value={entityId} />
        <input type="hidden" name="return_path" value={returnPath} />
        <textarea
          name="context_json"
          defaultValue={JSON.stringify(context, null, 2)}
          rows={4}
          className="font-mono text-xs"
        />
        <button className="w-full bg-emerald-700 text-white">Generate draft (review-only)</button>
      </form>
    </div>
  );
}
