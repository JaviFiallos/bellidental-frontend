/**
 * Pestaña del PDF. Los navegadores bloquean `window.open` si llega después de una respuesta asíncrona,
 * así que la pestaña se abre en el clic y, cuando llega el enlace, navega a él. El enlace es una URL del mismo
 * origen con un token temporal (el backend lo firma y vence); nunca se construye en el cliente ni lleva la sesión.
 */

/** Enlace temporal a un PDF que devuelve el backend (`POST …/pdf-link`, `POST …/receipt-link`). */
export interface DocumentLink {
  url: string;
  /** Instante ISO con zona en el que el enlace deja de funcionar. */
  expiresAt: string;
}

/** Abre una pestaña vacía en el clic del usuario. `null` si el navegador la bloqueó. */
export function openBlankPdfWindow(): Window | null {
  return window.open('', '_blank') ?? null;
}

/** Lleva la pestaña abierta al PDF por su enlace temporal. */
export function showPdfUrlInWindow(target: Window, url: string): void {
  target.location.href = url;
}

/** `true` si el enlace ya venció y hay que pedir uno nuevo. */
export function isLinkExpired(link: DocumentLink, now: number = Date.now()): boolean {
  return Date.parse(link.expiresAt) <= now;
}

/** Cierra la pestaña vacía cuando el PDF no se pudo obtener. */
export function closePdfWindow(target: Window | null): void {
  target?.close();
}
