import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { logout } from "@/app/auth-actions";
import { ClientBottomNav } from "@/app/_components/bottom-nav";

export default async function ClientAppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (session?.role !== "client") redirect("/");

  // Derruba a sessão se o cliente foi removido ou desativado.
  const { data: clientRow } = await supabaseAdmin()
    .from("clients")
    .select("is_active")
    .eq("id", session.clientId)
    .maybeSingle();
  if (!clientRow || clientRow.is_active === false) redirect("/logout");

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b border-[color:var(--color-line)] sticky top-0 z-10 bg-[color:var(--color-navy)]/90 backdrop-blur">
        <div className="mx-auto max-w-xl px-5 h-14 flex items-center justify-between gap-4">
          <Link href="/cliente" className="font-display text-2xl tracking-wide truncate">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Hidro Suce" className="h-8 w-auto" />
          </Link>
          <span className="text-xs text-[color:var(--color-faint)] truncate max-w-[16ch]">
            {session.clientName}
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl px-5 py-6 pb-28 flex-1">{children}</main>

      <ClientBottomNav onLogout={logout} />
    </div>
  );
}
