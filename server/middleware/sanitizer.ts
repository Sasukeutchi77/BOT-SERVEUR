/**
 * Utilitaires de masquage et d'assainissement des données sensibles
 */

/**
 * Masque les chiffres centraux d'un numéro de téléphone
 * Ex: +33612345678 -> +336•••••78
 */
export function maskPhoneNumber(phone?: string): string {
  if (!phone) return '';
  const clean = phone.trim();
  if (clean.length <= 6) return clean;

  const start = clean.slice(0, 4);
  const end = clean.slice(-2);
  return `${start}•••••${end}`;
}

/**
 * Supprime ou expurge les clés d'API, tokens JWT et mots de passe des logs
 */
export function sanitizeLogMessage(message: string): string {
  if (!message || typeof message !== 'string') return '';
  let sanitized = message;

  // Remplacer les tokens JWT
  sanitized = sanitized.replace(/Bearer\s+[A-Za-z0-9\-_.]+/gi, 'Bearer [REDACTED]');
  sanitized = sanitized.replace(/eyJ[A-Za-z0-9\-_]{10,}\.[A-Za-z0-9\-_]{10,}(\.[A-Za-z0-9\-_]+)?/g, '[REDACTED]');

  // Remplacer les mots de passe et secrets
  sanitized = sanitized.replace(/(password|secret|token|api[_\-]?key)["']?\s*[:=]\s*["']?([^"' \s,;]+)["']?/gi, '$1="[REDACTED]"');

  return sanitized;
}
