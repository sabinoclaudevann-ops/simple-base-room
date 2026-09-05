/** Configuração comercial do Q+Gestão */
export const PLAN_PRICE_LABEL = "R$ 35";
export const PLAN_PERIOD_LABEL = "/mês";
export const TRIAL_DAYS = 1;

/** Número de contato padrão para liberar/assinar o plano (formato internacional, só dígitos) */
export const SUPPORT_WHATSAPP = "5585992523048";

export function whatsappUrl(message: string, phone: string = SUPPORT_WHATSAPP): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits || SUPPORT_WHATSAPP}?text=${encodeURIComponent(message)}`;
}

/** Quantos dias faltam para a data (arredondado para cima, mínimo 0) */
export function daysLeft(iso: string | null): number {
  if (!iso) return 0;
  const ms = new Date(iso).getTime() - Date.now();
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000);
}

/** Quantas horas faltam para a data */
export function hoursLeft(iso: string | null): number {
  if (!iso) return 0;
  const ms = new Date(iso).getTime() - Date.now();
  return ms <= 0 ? 0 : Math.ceil(ms / 3_600_000);
}
