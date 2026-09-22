import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { formatCNPJ, type Client, type Equipment } from "@/lib/types";
import { NewEquipmentForm } from "./new-equipment-form";
import { ClientEdit } from "./client-edit";
import { EquipmentRow } from "./equipment-row";

export const dynamic = "force-dynamic";

type EquipRow = Equipment & { maintenance_records: { count: number }[] };
type CatOpt = { id: string; name: string; is_active: boolean };

export default async function ClientDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const isSuper = session?.role === "super_admin";
  const supa = supabaseAdmin();

  const { data: client } = await supa
    .from("clients")
    .select("id, name, cnpj, is_active, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!client) notFound();
  const c = client as Client;

  const { data: equipData } = await supa
    .from("equipment")
    .select("id, client_id, serial_number, label, brand, model, category_id, created_at, maintenance_records(count)")
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  const equipment = (equipData ?? []) as unknown as EquipRow[];

  const { data: catData } = await supa
    .from("categories")
    .select("id, name, is_active")
    .order("name", { ascending: true });
  const categories = (catData ?? []) as CatOpt[];
  const catName = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <div>
      <Link href="/admin/clientes" className="text-sm text-[color:var(--color-muted)] hover:text-white">
        ← Clientes
      </Link>

      <div className="flex items-start justify-between gap-3 mt-3 mb-6">
        <div className="flex items-start gap-2 min-w-0">
          <div className="min-w-0">
            <h1 className="font-display text-2xl tracking-wide">{c.name}</h1>
            <p className="text-sm text-[color:var(--color-muted)] font-mono mt-0.5">
              {formatCNPJ(c.cnpj)}
            </p>
          </div>
          {isSuper ? (
            <ClientEdit client={{ id: c.id, name: c.name, cnpj: c.cnpj, active: c.is_active }} />
          ) : null}
        </div>
        {isSuper ? <NewEquipmentForm clientId={c.id} categories={categories} /> : null}
      </div>

      <h2 className="text-sm font-medium text-[color:var(--color-steel)] mb-3">
        Equipamentos {equipment.length > 0 ? `(${equipment.length})` : ""}
      </h2>

      {equipment.length === 0 ? (
        <div className="card p-10 text-center text-[color:var(--color-muted)]">
          Nenhum equipamento cadastrado para este cliente ainda.
        </div>
      ) : (
        <div className="grid gap-3">
          {equipment.map((e) => (
            <EquipmentRow
              key={e.id}
              canEdit={isSuper}
              categories={categories}
              equip={{
                id: e.id,
                client_id: e.client_id,
                serial_number: e.serial_number,
                label: e.label,
                brand: e.brand,
                model: e.model,
                category_id: e.category_id,
                category_name: e.category_id ? catName.get(e.category_id) ?? null : null,
                count: e.maintenance_records?.[0]?.count ?? 0,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
