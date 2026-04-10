import Link from "next/link";

export function ExportButton({ href, label = "Export CSV" }: { href: string; label?: string }) {
  return (
    <Link href={href} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
      {label}
    </Link>
  );
}
