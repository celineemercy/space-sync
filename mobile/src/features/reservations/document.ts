const message = "Choose one PDF, JPG, or PNG up to 10 MB.";
const extensionMime: Record<string, string> = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png" };

export function reservationDocumentMime(document: { name: string; mimeType?: string; size?: number }): string {
  if (document.size !== undefined && (!Number.isFinite(document.size) || document.size <= 0 || document.size > 10 * 1024 * 1024)) throw new Error(message);
  const extension = document.name.includes(".") ? document.name.split(".").pop()!.toLowerCase() : "";
  const fromName = Object.prototype.hasOwnProperty.call(extensionMime, extension) ? extensionMime[extension] : undefined;
  const mime = document.mimeType?.split(";")[0].trim().toLowerCase();
  if (!mime || mime === "application/octet-stream") {
    if (fromName) return fromName;
    throw new Error(message);
  }
  if (!Object.values(extensionMime).includes(mime) || (extension && fromName !== mime)) throw new Error(message);
  return mime;
}
