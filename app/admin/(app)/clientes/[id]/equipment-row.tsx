"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/app/_components/modal";
import { IconEdit } from "@/app/_components/icons";
import { updateEquipmentAction, deleteEquipmentAction, type ActionState } from "../../../actions";

type CatOpt = { id: string; name: string; is_active: boolean };

type Equip = {
  id: string;
  client_id: string;
  serial_number: string;
  label: string | null;
  brand: string | null;
  model: string | null;
  category_id: string | null;
  category_name: string | null;
  count: number;
};

export function EquipmentRow({
  equip,
  canEdit,
  categories,
}: {
  equip: Equip;
  canEdit: boolean;
  categories: CatOpt[];
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [upState, upAction, upPending] = useActionState<ActionState, FormData>(
    updateEquipmentAction,
    null,
  );
  const [delState, delAction, delPending] = useActionState<ActionState, FormData>(
    deleteEquipmentAction,
    null,
  );

  useEffect(() => {
    if (upState?.ok) {
      setOpen(false);
      toast.success("Equipamento atualizado.");
    }
  }, [upState]);

  useEffect(() => {
    if (delState?.ok) {
      setOpen(false);
      toast.success("Equipamento removido.");
    }
  }, [delState]);

  return (
    <div className="card p-4 flex items-center justify-between gap-3">
      <Link href={`/admin/equipamentos/${equip.id}`} className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-medium">{equip.label || "Equipamento"}</span>
          <span className="font-mono text-xs text-[color:var(--color-blue-strong)]">
            {equip.serial_number}
          </span>
        </div>
        <div className="text-xs text-[color:var(--color-muted)] mt-0.5">
          {[equip.brand, equip.model].filter(Boolean).join(" · ") || "sem marca/modelo"} ·{" "}
          {equip.count} {equip.count === 1 ? "registro" : "registros"}
        </div>
        {equip.category_name ? (
          <div className="text-[11px] text-[color:var(--color-steel)] mt-0.5">{equip.category_name}</div>
        ) : null}
      </Link>
      {canEdit ? (
        <button className="icon-btn shrink-0" onClick={() => setOpen(true)} aria-label="Editar equipamento">
          <IconEdit />
        </button>
      ) : (
        <span className="text-[color:var(--color-faint)] shrink-0">›</span>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="EDITAR EQUIPAMENTO">
        <form action={upAction} className="grid gap-4">
          <input type="hidden" name="id" value={equip.id} />
          <input type="hidden" name="client_id" value={equip.client_id} />
          <div>
            <label className="label" htmlFor={`s-${equip.id}`}>Número de série</label>
            <input id={`s-${equip.id}`} name="serial_number" className="field" defaultValue={equip.serial_number} required />
          </div>
          <div>
            <label className="label" htmlFor={`l-${equip.id}`}>Identificação</label>
            <input id={`l-${equip.id}`} name="label" className="field" defaultValue={equip.label ?? ""} placeholder="Ex.: Empilhadeira 1" />
          </div>
          <div>
            <label className="label" htmlFor={`c-${equip.id}`}>Categoria</label>
            <select id={`c-${equip.id}`} name="category_id" className="field" defaultValue={equip.category_id ?? ""}>
              <option value="">Sem categoria</option>
              {categories
                .filter((c) => c.is_active || c.id === equip.category_id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {!c.is_active ? " (inativa)" : ""}
                  </option>
                ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor={`b-${equip.id}`}>Marca</label>
              <input id={`b-${equip.id}`} name="brand" className="field" defaultValue={equip.brand ?? ""} />
            </div>
            <div>
              <label className="label" htmlFor={`m-${equip.id}`}>Modelo</label>
              <input id={`m-${equip.id}`} name="model" className="field" defaultValue={equip.model ?? ""} />
            </div>
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

        <div className="border-t border-[color:var(--color-line)] mt-5 pt-4">
          {delState?.error ? (
            <p className="text-sm text-[color:var(--color-magenta)] mb-2">{delState.error}</p>
          ) : null}
          {confirming ? (
            <form action={delAction} className="grid gap-2">
              <input type="hidden" name="id" value={equip.id} />
              <input type="hidden" name="client_id" value={equip.client_id} />
              <span className="text-sm text-[color:var(--color-muted)]">
                Remover o equipamento e todo o histórico dele?
              </span>
              <div className="flex gap-2">
                <button className="btn btn-sm" style={{ background: "var(--color-magenta)", color: "white" }} disabled={delPending}>
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
              Remover equipamento
            </button>
          )}
        </div>
      </Modal>
    </div>
  );
}
