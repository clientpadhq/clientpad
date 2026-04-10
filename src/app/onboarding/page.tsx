import { redirect } from "next/navigation";
import {
  createWorkspaceAction,
  resumeOnboardingLaterAction,
  saveOnboardingStepAction,
  skipOnboardingStepAction,
} from "@/lib/actions/workspace";
import { requireUser } from "@/lib/auth/session";
import {
  ensureWorkspaceOnboardingState,
  getWorkspaceForUser,
  getWorkspaceOnboardingState,
  isWorkspaceOnboardingRequired,
} from "@/lib/db/workspace";

const presets = [
  { value: "service_business", label: "Service Business" },
  { value: "agency", label: "Agency" },
  { value: "retail", label: "Retail" },
  { value: "custom", label: "Custom" },
];

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const workspaceData = await getWorkspaceForUser(user.id);
  const params = await searchParams;

  if (!workspaceData) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-lg items-center px-4 py-10">
        <div className="w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Set up your workspace</h1>
          <p className="mt-1 text-sm text-slate-600">Create your first workspace to start using ClientPad.</p>
          {params.error ? <p className="mt-4 rounded bg-red-50 p-2 text-sm text-red-700">{params.error}</p> : null}
          <form action={createWorkspaceAction} className="mt-6 space-y-3">
            <input className="w-full rounded border border-slate-300 p-2" name="name" placeholder="Business name" required />
            <input className="w-full rounded border border-slate-300 p-2" name="phone" placeholder="Business phone" />
            <input
              className="w-full rounded border border-slate-300 p-2"
              name="business_type"
              placeholder="Business type (e.g., Solar installer)"
            />
            <button className="w-full rounded bg-emerald-600 px-3 py-2 text-white">Create workspace</button>
          </form>
        </div>
      </main>
    );
  }

  if (workspaceData.role === "staff") {
    redirect("/dashboard");
  }

  await ensureWorkspaceOnboardingState(workspaceData.workspace.id);

  const onboardingState = await getWorkspaceOnboardingState(workspaceData.workspace.id);
  if (!onboardingState) redirect("/dashboard");

  if (!isWorkspaceOnboardingRequired(workspaceData.role, onboardingState)) {
    redirect("/dashboard");
  }

  const currentStep = onboardingState.current_step;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Workspace onboarding</h1>
        <p className="mt-1 text-sm text-slate-600">
          Complete the required steps to unlock the full workspace experience.
        </p>

        {params.error ? <p className="mt-4 rounded bg-red-50 p-2 text-sm text-red-700">{params.error}</p> : null}

        <ol className="mt-6 space-y-2 text-sm">
          <li className={onboardingState.business_profile_completed ? "text-emerald-700" : "text-slate-700"}>
            1. Business profile basics
          </li>
          <li className={onboardingState.branding_payment_completed ? "text-emerald-700" : "text-slate-700"}>
            2. Branding/payment defaults
          </li>
          <li className={onboardingState.preset_selected ? "text-emerald-700" : "text-slate-700"}>3. Preset selection</li>
          <li className={onboardingState.data_import_completed ? "text-emerald-700" : "text-slate-700"}>
            4. Optional data import
          </li>
          <li className={onboardingState.completed_at ? "text-emerald-700" : "text-slate-700"}>5. Completion</li>
        </ol>

        {currentStep === "business_profile" ? (
          <form action={saveOnboardingStepAction} className="mt-6 space-y-3">
            <input type="hidden" name="step" value="business_profile" />
            <input className="w-full rounded border border-slate-300 p-2" name="name" defaultValue={workspaceData.workspace.name} required />
            <input className="w-full rounded border border-slate-300 p-2" name="phone" defaultValue={workspaceData.workspace.phone ?? ""} placeholder="Business phone" />
            <input
              className="w-full rounded border border-slate-300 p-2"
              name="business_type"
              defaultValue={workspaceData.workspace.business_type ?? ""}
              placeholder="Business type"
            />
            <button className="rounded bg-emerald-600 px-3 py-2 text-white">Save and continue</button>
          </form>
        ) : null}

        {currentStep === "branding_payment" ? (
          <form action={saveOnboardingStepAction} className="mt-6 space-y-3">
            <input type="hidden" name="step" value="branding_payment" />
            <input className="w-full rounded border border-slate-300 p-2" name="phone" defaultValue={workspaceData.workspace.phone ?? ""} placeholder="Business phone" />
            <input
              className="w-full rounded border border-slate-300 p-2"
              name="business_type"
              defaultValue={workspaceData.workspace.business_type ?? ""}
              placeholder="Business category"
            />
            <select
              className="w-full rounded border border-slate-300 p-2"
              name="default_currency"
              defaultValue={workspaceData.workspace.default_currency || "NGN"}
            >
              <option value="NGN">NGN</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
            <button className="rounded bg-emerald-600 px-3 py-2 text-white">Save and continue</button>
          </form>
        ) : null}

        {currentStep === "preset_selection" ? (
          <form action={saveOnboardingStepAction} className="mt-6 space-y-3">
            <input type="hidden" name="step" value="preset_selection" />
            <select
              className="w-full rounded border border-slate-300 p-2"
              name="selected_preset"
              defaultValue={onboardingState.selected_preset ?? ""}
              required
            >
              <option value="" disabled>
                Select a preset
              </option>
              {presets.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
            <button className="rounded bg-emerald-600 px-3 py-2 text-white">Save and continue</button>
          </form>
        ) : null}

        {currentStep === "data_import" ? (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-slate-600">Import contacts or deals now, or skip and come back later.</p>
            <form action={saveOnboardingStepAction}>
              <input type="hidden" name="step" value="data_import" />
              <input type="hidden" name="data_import_completed" value="true" />
              <button className="rounded bg-emerald-600 px-3 py-2 text-white">Mark import as complete</button>
            </form>
            <form action={skipOnboardingStepAction}>
              <input type="hidden" name="step" value="data_import" />
              <button className="rounded border border-slate-300 px-3 py-2 text-slate-700">Skip for now</button>
            </form>
            <form action={resumeOnboardingLaterAction}>
              <button className="rounded border border-slate-300 px-3 py-2 text-slate-700">Resume later</button>
            </form>
          </div>
        ) : null}

        {currentStep === "completed" ? (
          <div className="mt-6 space-y-3">
            <p className="rounded bg-emerald-50 p-3 text-sm text-emerald-700">Onboarding complete. Your workspace is ready.</p>
            <a className="inline-block rounded bg-emerald-600 px-3 py-2 text-white" href="/dashboard">
              Go to dashboard
            </a>
          </div>
        ) : null}
      </div>
    </main>
  );
}
