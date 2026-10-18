interface PairingSocket {
  ev: {
    on: (event: string, listener: (update: any) => void) => void;
    off?: (event: string, listener: (update: any) => void) => void;
    removeListener?: (event: string, listener: (update: any) => void) => void;
  };
  requestPairingCode: (phoneNumber: string) => Promise<string>;
}

/**
 * Baileys emits a QR update when the socket is ready to request a pairing code.
 * Waiting for a fixed delay is unreliable on cold or slow server connections.
 */
export function requestPairingCodeWhenReady(
  sock: PairingSocket,
  phoneNumber: string,
  timeoutMs = 30_000,
): Promise<string> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let requestStarted = false;
    let timer: ReturnType<typeof setTimeout>;

    const onUpdate = (update: any) => {
      if (update?.connection === 'close' && !requestStarted) {
        const statusCode = update.lastDisconnect?.error?.output?.statusCode;
        const detail = statusCode ? ` (code ${statusCode})` : '';
        finish(new Error(`WhatsApp a fermé le socket avant qu’il soit prêt${detail}.`));
        return;
      }

      if (update?.qr && !requestStarted) {
        requestStarted = true;
        Promise.resolve()
          .then(() => sock.requestPairingCode(phoneNumber))
          .then((code) => {
            if (typeof code !== 'string' || !code.trim()) {
              finish(new Error('WhatsApp n’a pas retourné de code de jumelage.'));
              return;
            }
            finish(undefined, code);
          })
          .catch((error) => {
            finish(error instanceof Error ? error : new Error(String(error)));
          });
      }
    };

    const cleanup = () => {
      clearTimeout(timer);
      if (sock.ev.off) {
        sock.ev.off('connection.update', onUpdate);
      } else {
        sock.ev.removeListener?.('connection.update', onUpdate);
      }
    };

    const finish = (error?: Error, code?: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else resolve(code || '');
    };

    timer = setTimeout(() => {
      finish(new Error('Délai dépassé : WhatsApp n’a pas préparé le socket de jumelage.'));
    }, timeoutMs);

    sock.ev.on('connection.update', onUpdate);
  });
}
