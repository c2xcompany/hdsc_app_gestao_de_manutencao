"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/app/_components/modal";
import { IconEdit } from "@/app/_components/icons";
import {
  updateCategoryAction,
  deleteCategoryAction,
  setCategoryActiveAction,
  type ActionState,
} from "../../actions";
import { formatBRL, type Category } from "@/lib/types";

export function CategoryRow({ category, usedBy }: { category: Category; usedBy: number }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [upState, upAction, upPending] = useActionState<ActionState, FormData>(
    updateCategoryAction,
    null,
  );
  const [delState, delAction, delPending] = useActionState<ActionState, FormData>(
    deleteCategoryAction,
    null,
  );
  const [tgState, tgAction, tgPending] = useActionState<ActionState, FormData>(
    setCategoryActiveAction,
    null,
  );

  useEffect(() => {
    if (upState?.ok) {
      setOpen(false);
      toast.success("Categoria atualizada.");
    }
  }, [upState]);

  useEffect(() => {
    if (tgState?.ok) toast.success("Categoria atualizada.");
  }, [tgState]);

  const priceReais = String(category.monthly_price_cents / 100).replace(".", ",");
  const noPrice = category.monthly_price_cents <= 0;

  return (
    <div className="card p-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="font-medium">
          {category.name}
          {!category.is_active ? (
            <span className="text-[color:var(--color-warn)] text-xs ml-2">· inativa</span>
          ) : null}
        </div>
        <div className="text-xs text-[color:var(--color-muted)] mt-0.5">
          {usedBy} {usedBy === 1 ? "equipamento" : "equipamentos"}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          {noPrice ? (
            <span className="text-sm text-[color:var(--color-faint)]">sem comparativo</span>
          ) : (
            <div className="text-sm font-semibold tabular-nums">
              {formatBRL(category.monthly_price_cents)}
              <span className="text-[11px] text-[color:var(--color-faint)] font-normal"> /mês</span>
            </div>
          )}
        </div>
        <button className="icon-btn" onClick={() => setOpen(true)} aria-label="Editar categoria">
          <IconEdit />
        </button>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="EDITAR CATEGORIA">
        <form action={upAction} className="grid gap-4">
          <input type="hidden" name="id" value={category.id} />
          <div>
            <label className="label" htmlFor={`n-${category.id}`}>Nome</label>
            <input id={`n-${category.id}`} name="name" className="field" defaultValue={category.name} required />
          </div>
          <div>
            <label className="label" htmlFor={`v-${category.id}`}>Valor de aluguel / mês</label>
            <input
              id={`v-${category.id}`}
              name="monthly_price"
              className="field"
              inputMode="decimal"
              defaultValue={priceReais}
              placeholder="0 = sem comparativo"
            />
          </div>
          {upState?.error ? (
            <p className="text-sm text-[color:var(--color-magenta)]">{upState.error}</p>
          ) : null}
          <div className="flex gap-2">
            <button className="btn btn-primary" disabled={upPending}>
              {upPending ? "Salvando…" : "Salvar"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              Cancelar
            </button>
          </div>
        </form>

        <div className="border-t border-[color:var(--color-line)] mt-5 pt-4 flex items-center justify-between gap-3">
          <div className="text-sm">
            <span className="text-[color:var(--color-muted)]">Status: </span>
            <b className={category.is_active ? "text-[color:var(--color-ok)]" : "text-[color:var(--color-warn)]"}>
              {category.is_active ? "ativa" : "inativa"}
            </b>
          </div>
          <form action={tgAction}>
            <input type="hidden" name="id" value={category.id} />
            <input type="hidden" name="active" value={category.is_active ? "0" : "1"} />
            <button className="btn btn-outline btn-sm" disabled={tgPending}>
              {tgPending ? "…" : category.is_active ? "Desativar" : "Ativar"}
            </button>
          </form>
        </div>
        {tgState?.error ? (
          <p className="text-sm text-[color:var(--color-magenta)] mt-2">{tgState.error}</p>
        ) : null}

        <div className="border-t border-[color:var(--color-line)] mt-4 pt-4">
          {delState?.error ? (
            <p className="text-sm text-[color:var(--color-magenta)] mb-2">{delState.error}</p>
          ) : null}
          {confirming ? (
            <form action={delAction} className="grid gap-2">
              <input type="hidden" name="id" value={category.id} />
              <span className="text-sm text-[color:var(--color-muted)]">
                Remover esta categoria?{" "}
                {usedBy > 0
                  ? `${usedBy} ${usedBy === 1 ? "equipamento ficará" : "equipamentos ficarão"} sem categoria.`
                  : ""}
              </span>
              <div className="flex gap-2">
                <button
                  className="btn btn-sm"
                  style={{ background: "var(--color-magenta)", color: "white" }}
                  disabled={delPending}
                >
                  {delPending ? "…" : "Sim, remover"}
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)}>
                  Não
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              className="text-sm text-[color:var(--color-magenta)] hover:underline"
              onClick={() => setConfirming(true)}
            >
              Remover categoria
            </button>
          )}
        </div>
      </Modal>
    </div>
  );
}
