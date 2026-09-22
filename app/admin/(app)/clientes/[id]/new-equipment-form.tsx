"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/app/_components/modal";
import { IconPlus } from "@/app/_components/icons";
import { createEquipmentAction, type ActionState } from "../../../actions";

type CatOpt = { id: string; name: string; is_active: boolean };

export function NewEquipmentForm({
  clientId,
  categories,
}: {
  clientId: string;
  categories: CatOpt[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createEquipmentAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setOpen(false);
      toast.success("Equipamento cadastrado.");
    }
  }, [state]);

  return (
    <>
      <button className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
        <IconPlus width={16} height={16} /> Equipamento
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="NOVO EQUIPAMENTO">
        <form ref={formRef} action={formAction} className="grid gap-4">
          <input type="hidden" name="client_id" value={clientId} />
          <div>
            <label className="label" htmlFor="serial_number">Número de série *</label>
            <input id="serial_number" name="serial_number" className="field" placeholder="Ex.: STFMX1-8842" required />
          </div>
          <div>
            <label className="label" htmlFor="label">Identificação</label>
            <input id="label" name="label" className="field" placeholder="Ex.: Empilhadeira 1" />
          </div>
          <div>
            <label className="label" htmlFor="category_id">Categoria</label>
            <select id="category_id" name="category_id" className="field" defaultValue="">
              <option value="">Sem categoria</option>
              {categories
                .filter((c) => c.is_active)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="brand">Marca</label>
              <input id="brand" name="brand" className="field" placeholder="Still" />
            </div>
            <div>
              <label className="label" htmlFor="model">Modelo</label>
              <input id="model" name="model" className="field" placeholder="RX60-25" />
            </div>
          </div>

          {state?.error ? (
            <p className="text-sm text-[color:var(--color-magenta)]">{state.error}</p>
          ) : null}

          <div className="flex gap-2 pt-1">
            <button className="btn btn-primary" disabled={pending}>
              {pending ? "Salvando…" : "Cadastrar"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
