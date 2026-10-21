/**
 * Pestaña del PDF. Los navegadores bloquean `window.open` si llega después de una respuesta asíncrona,
 * así que la pestaña se abre en el clic y el PDF se pone después, con un blob URL (el token no viaja en la URL).
 */

const PDF_URL_LIFETIME_MS = 60_000;

/** Abre una pestaña vacía en el clic del usuario. `null` si el navegador la bloqueó. */
export function openBlankPdfWindow(): Window | null {
  return window.open('', '_blank') ?? null;
}

/** Muestra el PDF en la pestaña abierta y libera la URL del blob después de un minuto. */
export function showPdfInWindow(target: Window, pdf: Blob): void {
  const url = URL.createObjectURL(pdf);
  target.location.href = url;
  setTimeout(() => URL.revokeObjectURL(url), PDF_URL_LIFETIME_MS);
}

/** Cierra la pestaña vacía cuando el PDF no se pudo obtener. */
export function closePdfWindow(target: Window | null): void {
  target?.close();
}
