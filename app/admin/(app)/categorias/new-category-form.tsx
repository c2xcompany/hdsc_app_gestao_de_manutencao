"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/app/_components/modal";
import { IconPlus } from "@/app/_components/icons";
import { createCategoryAction, type ActionState } from "../../actions";

export function NewCategoryForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createCategoryAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setOpen(false);
      toast.success("Categoria cadastrada.");
    }
  }, [state]);

  return (
    <>
      <button className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
        <IconPlus width={16} height={16} /> Nova categoria
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="NOVA CATEGORIA">
        <form ref={formRef} action={formAction} className="grid gap-4">
          <div>
            <label className="label" htmlFor="name">Nome</label>
            <input id="name" name="name" className="field" placeholder="Ex.: Empilhadeira retrátil" required />
          </div>
          <div>
            <label className="label" htmlFor="monthly_price">Valor de aluguel / mês</label>
            <input
              id="monthly_price"
              name="monthly_price"
              className="field"
              inputMode="decimal"
              placeholder="Ex.: 5.500 (deixe 0 para sem comparativo)"
            />
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
