export type Client = {
  id: string;
  name: string;
  cnpj: string;
  is_active: boolean;
  created_at: string;
};

export type Equipment = {
  id: string;
  client_id: string;
  serial_number: string;
  label: string | null;
  brand: string | null;
  model: string | null;
  category_id: string | null;
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
  monthly_price_cents: number;
  is_active: boolean;
  created_at: string;
};

export type MaintType = "preventiva" | "corretiva";

export type MaintenanceRecord = {
  id: string;
  equipment_id: string;
  type: MaintType;
  description: string;
  value_cents: number | null;
  performed_at: string;
  laudo_path: string | null;
  technician_name: string | null;
  created_at: string;
};

export const TYPE_LABEL: Record<MaintType, string> = {
  preventiva: "Preventiva",
  corretiva: "Corretiva",
};

export function formatCNPJ(digits: string): string {
  const d = (digits || "").replace(/\D/g, "").slice(0, 14);
  if (d.length !== 14) return digits;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function onlyDigits(s: string): string {
  return (s || "").replace(/\D/g, "");
}

export function formatBRL(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = iso.slice(0, 10).split("-");
  if (d.length !== 3) return iso;
  return `${d[2]}/${d[1]}/${d[0]}`;
}
