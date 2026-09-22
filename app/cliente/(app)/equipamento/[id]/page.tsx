import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { formatBRL, monthsInclusive, type Equipment, type MaintenanceRecord } from "@/lib/types";
import { HistoryTimeline } from "@/app/_components/history-timeline";
import { PrintButton } from "@/app/_components/print-button";

export const dynamic = "force-dynamic";

export default async function ClienteEquip({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (session?.role !== "client") redirect("/");
  const { id } = await params;
  const supa = supabaseAdmin();

  const { data: equip } = await supa
    .from("equipment")
    .select("id, client_id, serial_number, label, brand, model, category_id")
    .eq("id", id)
    .maybeSingle();

  // Isolamento: o equipamento precisa ser do cliente logado.
  if (!equip || (equip as Equipment).client_id !== session.clientId) notFound();
  const e = equip as Equipment;

  const { data: recData } = await supa
    .from("maintenance_records")
    .select("id, equipment_id, type, description, value_cents, performed_at, laudo_path, technician_name, created_at")
    .eq("equipment_id", id)
    .order("performed_at", { ascending: false })
    .order("created_at", { ascending: false });

  const records = (recData ?? []) as MaintenanceRecord[];
  const total = records.reduce((s, r) => s + (r.value_cents ?? 0), 0);

  // Comparativo "Ter × Alugar" deste equipamento (se tiver categoria com preço e manutenção).
  let monthlyPrice = 0;
  if (e.category_id) {
    const { data: cat } = await supa
      .from("categories")
      .select("monthly_price_cents")
      .eq("id", e.category_id)
      .maybeSingle();
    monthlyPrice = (cat as { monthly_price_cents: number } | null)?.monthly_price_cents ?? 0;
  }
  const since = records.length
    ? records.reduce<string>((min, r) => (min <= r.performed_at ? min : r.performed_at), records[0].performed_at)
    : null;
  const hasRental = monthlyPrice > 0 && since !== null;
  const rentMonths = hasRental ? monthsInclusive(since!, new Date()) : 0;
  const rentalCost = rentMonths * monthlyPrice;
  const savings = rentalCost - total;

  // Análise mensal deste equipamento: investimento por mês (da 1ª manutenção até hoje, últimos 12).
  const chartNow = new Date();
  const monthsBack = since ? Math.min(12, Math.max(1, monthsInclusive(since, chartNow))) : 0;
  const monthly = Array.from({ length: monthsBack }, (_, idx) => {
    const i = monthsBack - 1 - idx;
    const d = new Date(chartNow.getFullYear(), chartNow.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
    const cents = records
      .filter((r) => r.performed_at.slice(0, 7) === key)
      .reduce((s, r) => s + (r.value_cents ?? 0), 0);
    return { key, label, cents };
  });
  const maxMonthly = Math.max(1, ...monthly.map((m) => m.cents));
  const compact = (cents: number) => {
    const reais = cents / 100;
    if (reais <= 0) return "";
    if (reais >= 1000) return (reais / 1000).toFixed(1).replace(".", ",") + "k";
    return String(Math.round(reais));
  };

  return (
    <div>
      <Link href="/cliente" className="text-sm text-[color:var(--color-muted)] hover:text-white no-print">
        ← Meus equipamentos
      </Link>

      <div className="flex items-start justify-between gap-3 mt-3 mb-6">
        <div>
          <div className="hidden print:block text-sm text-[color:var(--color-muted)] mb-1">
            {session.clientName} · Hidro Suce
          </div>
          <h1 className="font-display text-3xl tracking-wide">{e.label || "Equipamento"}</h1>
          <p className="text-sm font-mono text-[color:var(--color-blue-strong)] mt-0.5">
            {e.serial_number}
          </p>
          <p className="text-xs text-[color:var(--color-muted)] mt-1">
            {[e.brand, e.model].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
        <PrintButton />
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="card px-4 py-3">
          <div className="text-xs text-[color:var(--color-faint)]">Manutenções</div>
          <div className="font-display text-2xl">{records.length}</div>
        </div>
        <div className="card px-4 py-3">
          <div className="text-xs text-[color:var(--color-faint)]">Total investido</div>
          <div className="font-display text-2xl">{formatBRL(total)}</div>
        </div>
        {hasRental ? (
          <div className="card px-4 py-3" style={{ borderColor: "var(--color-ok)" }}>
            <div className="text-xs text-[color:var(--color-faint)]">Economia vs. alugar</div>
            <div
              className="font-display text-2xl"
              style={{ color: savings >= 0 ? "var(--color-ok)" : "var(--color-warn)" }}
            >
              {formatBRL(savings)}
            </div>
            <div className="text-[11px] text-[color:var(--color-faint)] mt-0.5">
              alugar: {formatBRL(rentalCost)} · {rentMonths} {rentMonths === 1 ? "mês" : "meses"}
            </div>
          </div>
        ) : null}
      </div>

      {monthly.length > 0 ? (
        <div className="card p-5 mb-6 no-print">
          <div className="flex items-baseline justify-between mb-1">
            <h2 className="font-display text-lg tracking-wide">Investimento por mês</h2>
            <span className="text-xs text-[color:var(--color-faint)]">R$ · últimos {monthly.length} meses</span>
          </div>
          <div className="chart">
            {monthly.map((m, i) => (
              <div key={m.key + i} className="bar-col" title={`${m.label} · R$ ${compact(m.cents) || 0}`}>
                <span className="bar-val">{compact(m.cents)}</span>
                <div
                  className="bar"
                  style={{ height: `${m.cents > 0 ? Math.max(4, (m.cents / maxMonthly) * 100) : 2}%` }}
                />
                <span className="bar-m">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <h2 className="text-sm font-medium text-[color:var(--color-steel)] mb-3">
        Histórico de manutenções
      </h2>
      <HistoryTimeline records={records} />
    </div>
  );
}
