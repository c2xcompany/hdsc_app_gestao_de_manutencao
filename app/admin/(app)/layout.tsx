import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession, isStaff } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { logout } from "@/app/auth-actions";
import { AdminBottomNav } from "@/app/_components/bottom-nav";

export default async function AdminAppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!isStaff(session)) redirect("/");

  // Derruba a sessão se a conta da equipe foi removida ou desativada.
  const { data: staffRow } = await supabaseAdmin()
    .from("staff")
    .select("is_active")
    .eq("id", session.staffId)
    .maybeSingle();
  if (!staffRow || staffRow.is_active === false) redirect("/logout");

  const isSuper = session.role === "super_admin";

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b border-[color:var(--color-line)] sticky top-0 z-10 bg-[color:var(--color-navy)]/90 backdrop-blur">
        <div className="mx-auto max-w-xl px-5 h-14 flex items-center justify-between gap-4">
          <Link href="/admin" className="font-display text-2xl tracking-wide">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Hidro Suce" className="h-8 w-auto" />
          </Link>
          <span className="text-xs text-[color:var(--color-faint)] truncate">
            {session.name} · {isSuper ? "super admin" : "técnico"}
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl px-5 py-6 pb-28 flex-1">{children}</main>

      <AdminBottomNav isSuper={isSuper} onLogout={logout} />
    </div>
  );
}
