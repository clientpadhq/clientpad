import Link from "next/link";
import { signInWithPasswordAction, sendMagicLinkAction } from "@/lib/actions/auth";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Sign in to ClientPad</h1>
        <p className="mt-1 text-sm text-slate-600">Continue managing leads and deals.</p>
      </div>
      {params.error ? <p className="rounded bg-red-50 p-2 text-sm text-red-700">{params.error}</p> : null}
      {params.success ? <p className="rounded bg-green-50 p-2 text-sm text-green-700">{params.success}</p> : null}

      <form action={signInWithPasswordAction} className="space-y-3">
        <input type="email" name="email" placeholder="Email" required />
        <input type="password" name="password" placeholder="Password" required />
        <button className="w-full bg-emerald-600 text-white">Sign in</button>
      </form>

      <form action={sendMagicLinkAction} className="space-y-3 border-t border-slate-100 pt-3">
        <label className="text-sm font-medium text-slate-700">Or sign in with magic link</label>
        <input type="email" name="email" placeholder="Email" required />
        <button className="w-full border border-slate-300 text-slate-700">Send magic link</button>
      </form>

      <p className="text-sm text-slate-600">
        New here? <Link className="font-medium text-emerald-700" href="/sign-up">Create an account</Link>
      </p>
    </div>
  );
}
