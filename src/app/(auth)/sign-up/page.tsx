import Link from "next/link";
import { signUpAction } from "@/lib/actions/auth";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Create your ClientPad account</h1>
        <p className="mt-1 text-sm text-slate-600">Get started with your workspace in minutes.</p>
      </div>

      {params.error ? <p className="rounded bg-red-50 p-2 text-sm text-red-700">{params.error}</p> : null}

      <form action={signUpAction} className="space-y-3">
        <input type="email" name="email" placeholder="Email" required />
        <input type="password" name="password" placeholder="Password" minLength={8} required />
        <button className="w-full bg-emerald-600 text-white">Create account</button>
      </form>

      <p className="text-sm text-slate-600">
        Have an account? <Link className="font-medium text-emerald-700" href="/sign-in">Sign in</Link>
      </p>
    </div>
  );
}
