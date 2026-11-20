import { reservationDocumentMime } from "./document";
import { reservationsRepository } from "./repository";
jest.mock("@/storage/database", () => ({ cacheReservations: jest.fn(), getCachedReservations: jest.fn() }));

it.each(["pdf", "jpg", "jpeg", "png"])("accepts %s with missing MIME metadata", (extension) => {
  expect(reservationDocumentMime({ name: `permission.${extension}`, size: 100 })).toMatch(/^(application\/pdf|image\/(jpeg|png))$/);
});
it("accepts uppercase extensions and the 10 MB size boundary", () => {
  expect(reservationDocumentMime({ name: "PHOTO.JPG", mimeType: "image/jpeg", size: 10 * 1024 * 1024 })).toBe("image/jpeg");
  expect(reservationDocumentMime({ name: "permission.pdf", mimeType: "application/octet-stream" })).toBe("application/pdf");
});
it.each([
  { name: "app.apk", mimeType: "application/vnd.android.package-archive" },
  { name: "file.zip", mimeType: "application/zip" },
  { name: "script.sh", mimeType: "text/plain" },
  { name: "file.constructor", mimeType: "application/octet-stream" },
  { name: "file.__proto__" },
  { name: "fake.pdf.exe", mimeType: "application/pdf" },
  { name: "fake.png", mimeType: "application/pdf" },
  { name: "file.pdf", mimeType: "application/pdf", size: 10 * 1024 * 1024 + 1 },
  { name: "file.pdf", size: 0 },
])("blocks invalid documents before any network upload: $name", (document) => {
  const fetch = jest.spyOn(globalThis, "fetch");
  try {
    expect(() => reservationsRepository.create({ roomId: "room", startsAt: "2030-01-01T01:00:00Z", endsAt: "2030-01-01T02:00:00Z", document: { uri: "file://document", mimeType: "", ...document } })).toThrow(/PDF, JPG, or PNG/);
    expect(fetch).not.toHaveBeenCalled();
  } finally { fetch.mockRestore(); }
});
