"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession, isStaff } from "@/lib/session";
import { hashPassword } from "@/lib/password";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit.server";
import { onlyDigits } from "@/lib/types";

export type ActionState = { error?: string; ok?: boolean } | null;

async function requireStaff() {
  const session = await getSession();
  if (!isStaff(session)) return null;
  return session;
}

async function requireSuper() {
  const session = await getSession();
  return session?.role === "super_admin" ? session : null;
}

const NOT_SUPER = { error: "Apenas o super admin pode fazer isso." } as const;

export async function createClientAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (session?.role !== "super_admin") {
    return { error: "Apenas o super admin pode cadastrar clientes." };
  }

  const name = String(formData.get("name") || "").trim();
  const cnpj = onlyDigits(String(formData.get("cnpj") || ""));
  const password = String(formData.get("password") || "");

  if (name.length < 2) return { error: "Informe o nome da empresa." };
  if (cnpj.length !== 14) return { error: "CNPJ deve ter 14 dígitos." };
  if (password.length < 6) return { error: "A senha do cliente deve ter ao menos 6 caracteres." };

  const supa = supabaseAdmin();
  const { data: existing } = await supa.from("clients").select("id").eq("cnpj", cnpj).maybeSingle();
  if (existing) return { error: "Já existe um cliente com esse CNPJ." };

  const password_hash = await hashPassword(password);
  const { error } = await supa.from("clients").insert({ name, cnpj, password_hash });
  if (error) return { error: "Erro ao salvar: " + error.message };

  await logAudit("cadastrou", "cliente", name);
  revalidatePath("/admin/clientes");
  revalidatePath("/admin");
  return { ok: true };
}

export async function createEquipmentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSuper();
  if (!session) return NOT_SUPER;

  const client_id = String(formData.get("client_id") || "").trim();
  const serial_number = String(formData.get("serial_number") || "").trim().toUpperCase();
  const label = String(formData.get("label") || "").trim();
  const brand = String(formData.get("brand") || "").trim();
  const model = String(formData.get("model") || "").trim();
  const category_id = String(formData.get("category_id") || "").trim();

  if (!client_id) return { error: "Cliente inválido." };
  if (serial_number.length < 2) return { error: "Informe o número de série." };

  const supa = supabaseAdmin();
  const { data: existing } = await supa
    .from("equipment")
    .select("id")
    .eq("serial_number", serial_number)
    .maybeSingle();
  if (existing) return { error: "Já existe um equipamento com esse número de série." };

  const { error } = await supa.from("equipment").insert({
    client_id,
    serial_number,
    label: label || null,
    brand: brand || null,
    model: model || null,
    category_id: category_id || null,
  });
  if (error) return { error: "Erro ao salvar: " + error.message };

  await logAudit("cadastrou", "equipamento", serial_number);
  revalidatePath(`/admin/clientes/${client_id}`);
  return { ok: true };
}

function parseBRLtoCents(raw: string): number | null {
  let s = (raw || "").trim().replace(/\s|R\$/gi, "");
  if (!s) return null;
  if (s.includes(",")) {
    // vírgula = decimal; pontos = separador de milhar
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (!/^\d+\.\d{1,2}$/.test(s)) {
    // sem vírgula e não é "1234.56" (ponto decimal) → pontos são milhar
    s = s.replace(/\./g, "");
  }
  const value = Number(s);
  if (!Number.isFinite(value) || value < 0) return null; // bloqueia inválido/negativo
  return Math.round(value * 100);
}

export async function createRecordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireStaff();
  if (!session) return { error: "Sessão expirada. Entre novamente." };

  const equipment_id = String(formData.get("equipment_id") || "").trim();
  const type = String(formData.get("type") || "");
  const description = String(formData.get("description") || "").trim();
  const performed_at = String(formData.get("performed_at") || "").trim();
  // Técnico só registra em nome próprio; super admin escolhe o técnico.
  const technician_name =
    session.role === "tecnico"
      ? session.name
      : String(formData.get("technician_name") || "").trim() || session.name;
  // Só o super admin informa valor; técnico registra sem valor.
  const value_cents =
    session.role === "super_admin" ? parseBRLtoCents(String(formData.get("value") || "")) : null;

  if (!equipment_id) return { error: "Equipamento inválido." };
  if (type !== "preventiva" && type !== "corretiva") return { error: "Selecione o tipo." };
  if (description.length < 3) return { error: "Descreva a manutenção." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(performed_at)) return { error: "Data inválida." };

  const supa = supabaseAdmin();

  // Anexo do laudo em PDF (opcional) → bucket privado 'laudos'.
  let laudo_path: string | null = null;
  const file = formData.get("laudo");
  if (file instanceof File && file.size > 0) {
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) return { error: "O anexo deve ser um arquivo PDF." };
    if (file.size > 20 * 1024 * 1024) return { error: "O PDF é muito grande (máx. 20 MB)." };

    const path = `${equipment_id}/${crypto.randomUUID()}.pdf`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: upErr } = await supa.storage
      .from("laudos")
      .upload(path, bytes, { contentType: "application/pdf", upsert: false });
    if (upErr) return { error: "Erro ao enviar o PDF: " + upErr.message };
    laudo_path = path;
  }

  const { error } = await supa.from("maintenance_records").insert({
    equipment_id,
    type,
    description,
    value_cents,
    performed_at,
    technician_name,
    laudo_path,
  });
  if (error) return { error: "Erro ao salvar: " + error.message };

  await logAudit("registrou", "manutenção", type);
  revalidatePath(`/admin/equipamentos/${equipment_id}`);
  return { ok: true };
}

export async function updateRecordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireStaff();
  if (!session) return { error: "Sessão expirada. Entre novamente." };

  const id = String(formData.get("id") || "").trim();
  const equipment_id = String(formData.get("equipment_id") || "").trim();
  const type = String(formData.get("type") || "");
  const description = String(formData.get("description") || "").trim();
  const performed_at = String(formData.get("performed_at") || "").trim();
  const submittedTech = String(formData.get("technician_name") || "").trim();
  const submittedValueCents = parseBRLtoCents(String(formData.get("value") || ""));

  if (!id) return { error: "Registro inválido." };
  if (type !== "preventiva" && type !== "corretiva") return { error: "Selecione o tipo." };
  if (description.length < 3) return { error: "Descreva a manutenção." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(performed_at)) return { error: "Data inválida." };

  const supa = supabaseAdmin();
  const { data: current } = await supa
    .from("maintenance_records")
    .select("laudo_path, equipment_id, technician_name, value_cents")
    .eq("id", id)
    .maybeSingle();
  if (!current) return { error: "Registro não encontrado." };

  // Técnico não reatribui o registro nem altera o valor; super admin pode.
  const cur = current as { technician_name: string | null; value_cents: number | null };
  const technician_name =
    session.role === "tecnico"
      ? (cur.technician_name ?? session.name)
      : submittedTech || session.name;
  const value_cents = session.role === "super_admin" ? submittedValueCents : cur.value_cents;

  let laudo_path = (current as { laudo_path: string | null }).laudo_path;
  const oldPath = laudo_path;
  const equipId = equipment_id || (current as { equipment_id: string }).equipment_id;

  const file = formData.get("laudo");
  const removeLaudo = formData.get("remove_laudo") === "1";

  if (file instanceof File && file.size > 0) {
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) return { error: "O anexo deve ser um arquivo PDF." };
    if (file.size > 20 * 1024 * 1024) return { error: "O PDF é muito grande (máx. 20 MB)." };
    const path = `${equipId}/${crypto.randomUUID()}.pdf`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: upErr } = await supa.storage
      .from("laudos")
      .upload(path, bytes, { contentType: "application/pdf", upsert: false });
    if (upErr) return { error: "Erro ao enviar o PDF: " + upErr.message };
    laudo_path = path;
    if (oldPath) await supa.storage.from("laudos").remove([oldPath]);
  } else if (removeLaudo && oldPath) {
    await supa.storage.from("laudos").remove([oldPath]);
    laudo_path = null;
  }

  const { error } = await supa
    .from("maintenance_records")
    .update({ type, description, value_cents, performed_at, technician_name, laudo_path })
    .eq("id", id);
  if (error) return { error: "Erro ao salvar: " + error.message };

  await logAudit("editou", "manutenção", type);
  revalidatePath(`/admin/equipamentos/${equipId}`);
  return { ok: true };
}

export async function deleteRecordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireStaff();
  if (!session) return { error: "Sem permissão." };

  const id = String(formData.get("id") || "").trim();
  const equipment_id = String(formData.get("equipment_id") || "").trim();
  if (!id) return { error: "Registro inválido." };

  const supa = supabaseAdmin();
  const { data: current } = await supa
    .from("maintenance_records")
    .select("laudo_path")
    .eq("id", id)
    .maybeSingle();

  const laudoPath = (current as { laudo_path: string | null } | null)?.laudo_path;
  if (laudoPath) await supa.storage.from("laudos").remove([laudoPath]);

  const { error } = await supa.from("maintenance_records").delete().eq("id", id);
  if (error) return { error: "Erro ao remover: " + error.message };

  await logAudit("removeu", "manutenção");
  if (equipment_id) revalidatePath(`/admin/equipamentos/${equipment_id}`);
  return { ok: true };
}

export async function createTecnicoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (session?.role !== "super_admin") {
    return { error: "Apenas o super admin pode adicionar técnicos." };
  }

  const name = String(formData.get("name") || "").trim();
  const username = String(formData.get("username") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (name.length < 2) return { error: "Informe o nome do técnico." };
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
    return { error: "Usuário: 3–40 caracteres (letras, números, ponto, hífen, underline)." };
  }
  if (password.length < 6) return { error: "A senha deve ter ao menos 6 caracteres." };

  const supa = supabaseAdmin();
  const { data: existing } = await supa
    .from("staff")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (existing) return { error: "Já existe um usuário com esse nome." };

  const password_hash = await hashPassword(password);
  const { error } = await supa
    .from("staff")
    .insert({ name, username, password_hash, role: "tecnico" });
  if (error) return { error: "Erro ao salvar: " + error.message };

  await logAudit("cadastrou", "técnico", username);
  revalidatePath("/admin/tecnicos");
  return { ok: true };
}

export async function updateStaffAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (session?.role !== "super_admin") {
    return { error: "Apenas o super admin pode editar a equipe." };
  }

  const id = String(formData.get("id") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const username = String(formData.get("username") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!id) return { error: "Registro inválido." };
  if (name.length < 2) return { error: "Informe o nome." };
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
    return { error: "Usuário: 3–40 caracteres (letras, números, ponto, hífen, underline)." };
  }

  const supa = supabaseAdmin();
  const { data: target } = await supa.from("staff").select("role").eq("id", id).maybeSingle();
  if (!target) return { error: "Registro não encontrado." };
  if ((target as { role: string }).role === "super_admin") {
    return { error: "O super admin só pode ser alterado pelo banco de dados." };
  }

  const { data: clash } = await supa
    .from("staff")
    .select("id")
    .eq("username", username)
    .neq("id", id)
    .maybeSingle();
  if (clash) return { error: "Já existe outro usuário com esse nome." };

  const update: { name: string; username: string; password_hash?: string } = { name, username };
  if (password) {
    if (password.length < 6) return { error: "A nova senha deve ter ao menos 6 caracteres." };
    update.password_hash = await hashPassword(password);
  }

  const { error } = await supa.from("staff").update(update).eq("id", id);
  if (error) return { error: "Erro ao salvar: " + error.message };

  await logAudit("editou", "técnico", username);
  revalidatePath("/admin/tecnicos");
  return { ok: true };
}

export async function deleteStaffAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (session?.role !== "super_admin") return { error: "Sem permissão." };

  const id = String(formData.get("id") || "").trim();
  const supa = supabaseAdmin();

  const { data: target } = await supa.from("staff").select("role").eq("id", id).maybeSingle();
  if (!target) return { error: "Técnico não encontrado." };
  if ((target as { role: string }).role === "super_admin") {
    return { error: "Não é possível remover um super admin." };
  }

  const { error } = await supa.from("staff").delete().eq("id", id);
  if (error) return { error: "Erro ao remover: " + error.message };

  await logAudit("removeu", "técnico");
  revalidatePath("/admin/tecnicos");
  return { ok: true };
}

export async function updateClientAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSuper();
  if (!session) return NOT_SUPER;

  const id = String(formData.get("id") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const cnpj = onlyDigits(String(formData.get("cnpj") || ""));
  const password = String(formData.get("password") || "");

  if (!id) return { error: "Registro inválido." };
  if (name.length < 2) return { error: "Informe o nome da empresa." };
  if (cnpj.length !== 14) return { error: "CNPJ deve ter 14 dígitos." };

  const supa = supabaseAdmin();
  const { data: clash } = await supa
    .from("clients")
    .select("id")
    .eq("cnpj", cnpj)
    .neq("id", id)
    .maybeSingle();
  if (clash) return { error: "Já existe outro cliente com esse CNPJ." };

  const update: { name: string; cnpj: string; password_hash?: string } = { name, cnpj };
  if (password) {
    if (password.length < 6) return { error: "A nova senha deve ter ao menos 6 caracteres." };
    update.password_hash = await hashPassword(password);
  }

  const { error } = await supa.from("clients").update(update).eq("id", id);
  if (error) return { error: "Erro ao salvar: " + error.message };

  await logAudit("editou", "cliente", name);
  revalidatePath(`/admin/clientes/${id}`);
  revalidatePath("/admin/clientes");
  return { ok: true };
}

export async function deleteClientAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSuper();
  if (!session) return NOT_SUPER;

  const id = String(formData.get("id") || "").trim();
  if (!id) return { error: "Registro inválido." };

  const supa = supabaseAdmin();
  const { error } = await supa.from("clients").delete().eq("id", id);
  if (error) return { error: "Erro ao remover: " + error.message };

  await logAudit("removeu", "cliente");
  revalidatePath("/admin/clientes");
  redirect("/admin/clientes");
}

export async function updateEquipmentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSuper();
  if (!session) return NOT_SUPER;

  const id = String(formData.get("id") || "").trim();
  const client_id = String(formData.get("client_id") || "").trim();
  const serial_number = String(formData.get("serial_number") || "").trim().toUpperCase();
  const label = String(formData.get("label") || "").trim();
  const brand = String(formData.get("brand") || "").trim();
  const model = String(formData.get("model") || "").trim();
  const category_id = String(formData.get("category_id") || "").trim();

  if (!id) return { error: "Registro inválido." };
  if (serial_number.length < 2) return { error: "Informe o número de série." };

  const supa = supabaseAdmin();
  const { data: clash } = await supa
    .from("equipment")
    .select("id")
    .eq("serial_number", serial_number)
    .neq("id", id)
    .maybeSingle();
  if (clash) return { error: "Já existe outro equipamento com esse número de série." };

  const { error } = await supa
    .from("equipment")
    .update({
      serial_number,
      label: label || null,
      brand: brand || null,
      model: model || null,
      category_id: category_id || null,
    })
    .eq("id", id);
  if (error) return { error: "Erro ao salvar: " + error.message };

  await logAudit("editou", "equipamento", serial_number);
  if (client_id) revalidatePath(`/admin/clientes/${client_id}`);
  revalidatePath(`/admin/equipamentos/${id}`);
  return { ok: true };
}

export async function deleteEquipmentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSuper();
  if (!session) return NOT_SUPER;

  const id = String(formData.get("id") || "").trim();
  const client_id = String(formData.get("client_id") || "").trim();
  if (!id) return { error: "Registro inválido." };

  const supa = supabaseAdmin();
  const { error } = await supa.from("equipment").delete().eq("id", id);
  if (error) return { error: "Erro ao remover: " + error.message };

  await logAudit("removeu", "equipamento");
  if (client_id) revalidatePath(`/admin/clientes/${client_id}`);
  return { ok: true };
}

export async function setClientActiveAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSuper();
  if (!session) return NOT_SUPER;

  const id = String(formData.get("id") || "").trim();
  const active = formData.get("active") === "1";
  if (!id) return { error: "Registro inválido." };

  const supa = supabaseAdmin();
  const { error } = await supa.from("clients").update({ is_active: active }).eq("id", id);
  if (error) return { error: "Erro: " + error.message };

  await logAudit(active ? "ativou" : "desativou", "cliente");
  revalidatePath(`/admin/clientes/${id}`);
  revalidatePath("/admin/clientes");
  return { ok: true };
}

export async function createCategoryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSuper();
  if (!session) return NOT_SUPER;

  const name = String(formData.get("name") || "").trim();
  const price_cents = parseBRLtoCents(String(formData.get("monthly_price") || "")) ?? 0;

  if (name.length < 2) return { error: "Informe o nome da categoria." };

  const supa = supabaseAdmin();
  const { data: existing } = await supa
    .from("categories")
    .select("id")
    .ilike("name", name)
    .maybeSingle();
  if (existing) return { error: "Já existe uma categoria com esse nome." };

  const { error } = await supa
    .from("categories")
    .insert({ name, monthly_price_cents: price_cents });
  if (error) return { error: "Erro ao salvar: " + error.message };

  await logAudit("cadastrou", "categoria", name);
  revalidatePath("/admin/categorias");
  return { ok: true };
}

export async function updateCategoryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSuper();
  if (!session) return NOT_SUPER;

  const id = String(formData.get("id") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const price_cents = parseBRLtoCents(String(formData.get("monthly_price") || "")) ?? 0;

  if (!id) return { error: "Registro inválido." };
  if (name.length < 2) return { error: "Informe o nome da categoria." };

  const supa = supabaseAdmin();
  const { data: clash } = await supa
    .from("categories")
    .select("id")
    .ilike("name", name)
    .neq("id", id)
    .maybeSingle();
  if (clash) return { error: "Já existe outra categoria com esse nome." };

  const { error } = await supa
    .from("categories")
    .update({ name, monthly_price_cents: price_cents })
    .eq("id", id);
  if (error) return { error: "Erro ao salvar: " + error.message };

  await logAudit("editou", "categoria", name);
  revalidatePath("/admin/categorias");
  return { ok: true };
}

export async function setCategoryActiveAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSuper();
  if (!session) return NOT_SUPER;

  const id = String(formData.get("id") || "").trim();
  const active = formData.get("active") === "1";
  if (!id) return { error: "Registro inválido." };

  const supa = supabaseAdmin();
  const { error } = await supa.from("categories").update({ is_active: active }).eq("id", id);
  if (error) return { error: "Erro: " + error.message };

  await logAudit(active ? "ativou" : "desativou", "categoria");
  revalidatePath("/admin/categorias");
  return { ok: true };
}

export async function deleteCategoryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSuper();
  if (!session) return NOT_SUPER;

  const id = String(formData.get("id") || "").trim();
  if (!id) return { error: "Registro inválido." };

  const supa = supabaseAdmin();
  // Equipamentos que usam a categoria ficam sem categoria (category_id = null via FK on delete set null).
  const { error } = await supa.from("categories").delete().eq("id", id);
  if (error) return { error: "Erro ao remover: " + error.message };

  await logAudit("removeu", "categoria");
  revalidatePath("/admin/categorias");
  return { ok: true };
}

export async function setStaffActiveAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (session?.role !== "super_admin") return NOT_SUPER;

  const id = String(formData.get("id") || "").trim();
  const active = formData.get("active") === "1";
  if (!id) return { error: "Registro inválido." };

  const supa = supabaseAdmin();
  const { data: target } = await supa.from("staff").select("role").eq("id", id).maybeSingle();
  if (!target) return { error: "Técnico não encontrado." };
  if ((target as { role: string }).role === "super_admin") {
    return { error: "Não é possível desativar um super admin." };
  }

  const { error } = await supa.from("staff").update({ is_active: active }).eq("id", id);
  if (error) return { error: "Erro: " + error.message };

  await logAudit(active ? "ativou" : "desativou", "técnico");
  revalidatePath("/admin/tecnicos");
  return { ok: true };
}
