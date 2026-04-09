import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const INVALID_TARGET_REDIRECT = "/dashboard?error=invalid_whatsapp_target";

function getSafeRedirectTarget(rawTarget: string, requestUrl: string): string | null {
  try {
    const requestOrigin = new URL(requestUrl).origin;
    const parsedTarget = new URL(rawTarget, requestOrigin);

    const isWhatsAppShare = parsedTarget.protocol === "https:" && parsedTarget.host === "wa.me";
    const isOwnOrigin = parsedTarget.origin === requestOrigin;

    if (!isWhatsAppShare && !isOwnOrigin) return null;

    return parsedTarget.toString();
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const target = url.searchParams.get("target");
  const log = url.searchParams.get("log");

  if (!target) return NextResponse.redirect(new URL(INVALID_TARGET_REDIRECT, request.url));

  const safeTarget = getSafeRedirectTarget(target, request.url);
  if (!safeTarget) return NextResponse.redirect(new URL(INVALID_TARGET_REDIRECT, request.url));

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user && log) {
      const parsed = JSON.parse(log) as {
        workspace_id: string;
        entity_type: string;
        entity_id: string;
        activity_type: string;
        description: string;
      };
      const { data: membership } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("workspace_id", parsed.workspace_id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (membership) {
        await supabase.from("activities").insert({
          workspace_id: parsed.workspace_id,
          actor_user_id: user.id,
          entity_type: parsed.entity_type,
          entity_id: parsed.entity_id,
          activity_type: parsed.activity_type,
          description: parsed.description,
        });
      }
    }
  } catch {
    // no-op for share logging failures
  }

  return NextResponse.redirect(safeTarget);
}
