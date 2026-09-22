import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { type Category } from "@/lib/types";
import { NewCategoryForm } from "./new-category-form";
import { CategoryRow } from "./category-row";

export const dynamic = "force-dynamic";

export default async function CategoriasPage() {
  const session = await getSession();
  if (session?.role !== "super_admin") redirect("/admin");

  const supa = supabaseAdmin();
  const { data } = await supa
    .from("categories")
    .select("id, name, monthly_price_cents, is_active, created_at")
    .order("monthly_price_cents", { ascending: true });

  const categories = (data ?? []) as Category[];

  // Quantos equipamentos usam cada categoria (para avisar antes de remover).
  const { data: equipData } = await supa.from("equipment").select("category_id");
  const counts = new Map<string, number>();
  for (const e of (equipData ?? []) as { category_id: string | null }[]) {
    if (e.category_id) counts.set(e.category_id, (counts.get(e.category_id) ?? 0) + 1);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-3xl tracking-wide">CATEGORIAS</h1>
          <p className="text-sm text-[color:var(--color-muted)]">
            Tipos de equipamento e o valor mensal de aluguel usado no comparativo do cliente.
          </p>
        </div>
        <NewCategoryForm />
      </div>

      {categories.length === 0 ? (
        <div className="card p-10 text-center text-[color:var(--color-muted)]">
          Nenhuma categoria cadastrada ainda.
        </div>
      ) : (
        <div className="grid gap-3">
          {categories.map((c) => (
            <CategoryRow key={c.id} category={c} usedBy={counts.get(c.id) ?? 0} />
          ))}
        </div>
      )}

      <p className="text-xs text-[color:var(--color-faint)] mt-5">
        Valor <b>R$ 0</b> = categoria sem comparativo de aluguel (ex.: semi-elétrica).
      </p>
    </div>
  );
}
