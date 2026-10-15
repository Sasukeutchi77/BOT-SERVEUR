/**
 * Nettoie les journaux et les réponses pour ne jamais exposer
 * les tokens secrets, clés WhatsApp, mots de passe ou payloads privés.
 */
export function sanitizeLogMessage(input: string): string {
  if (!input) return '';
  return input
    .replace(/(Bearer\s+)[A-Za-z0-9._-]+/gi, '$1[REDACTED_TOKEN]')
    .replace(/(password|secret|authKey|privateKey|token)["']?\s*[:=]\s*["']?[^"',\s}]+/gi, '$1: "[REDACTED]"')
    .replace(/(clientToken|encKey|macKey)["']?\s*[:=]\s*["']?[^"',\s}]+/gi, '$1: "[REDACTED_KEY]"')
    .replace(/(\b\d{4})[- ]?(\d{4})[- ]?(\d{4})[- ]?(\d{4}\b)/g, '••••-••••-••••-$4')
    .replace(/([a-zA-Z0-9_\-\.]+@[a-zA-Z0-9_\-\.]+\.[a-zA-Z]{2,5})/gi, (match) => {
      const parts = match.split('@');
      if (parts[0].length <= 2) return match;
      return `${parts[0].slice(0, 2)}•••@${parts[1]}`;
    });
}

/**
 * Masque partiellement un numéro de téléphone pour l'affichage sécurisé (ex: +33 6 •• •• 78)
 */
export function maskPhoneNumber(phone?: string): string {
  if (!phone) return 'Non associé';
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.length < 8) return cleaned;
  const prefix = cleaned.slice(0, 4);
  const suffix = cleaned.slice(-2);
  return `${prefix} ••• •• ${suffix}`;
}
