export function getWebCrypto() {
  const wc = globalThis.crypto
  if (!wc) {
    throw new Error("Web Crypto indisponível. Abra a aplicação em um navegador moderno.")
  }

  if (typeof globalThis.isSecureContext === "boolean" && !globalThis.isSecureContext) {
    throw new Error("Web Crypto requer contexto seguro. Use HTTPS (ou http://localhost).")
  }

  if (!wc.subtle) {
    throw new Error("Seu navegador não suporta crypto.subtle. Atualize o navegador ou use outro.")
  }

  return wc
}
