export function sanitizeWhatsApp(value: string) {
  return value.replace(/\D/g, "");
}

export function buildWhatsAppUrl(whatsapp: string, message: string) {
  return `https://wa.me/${sanitizeWhatsApp(whatsapp)}?text=${encodeURIComponent(message)}`;
}
