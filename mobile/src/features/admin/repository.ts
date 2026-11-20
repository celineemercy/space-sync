import { apiRequest } from "@/lib/api";
import type { AdminReservation, Reservation } from "@/types/domain";

export function listAdminRequests(token: string, status?: string, page = 1) {
  const query = new URLSearchParams({ page: String(page), ...(status ? { status } : {}) });
  return apiRequest<{ items: AdminReservation[]; total: number; page: number }>(`/reservations/admin?${query}`, {}, token);
}

export function getAdminRequest(token: string, id: string) {
  return apiRequest<AdminReservation>(`/reservations/admin/${encodeURIComponent(id)}`, {}, token);
}

export function decideRequest(token: string, id: string, decision: "approve" | "reject", reason?: string) {
  return apiRequest<Reservation>(`/reservations/admin/${encodeURIComponent(id)}/${decision}`, {
    method: "PATCH",
    body: JSON.stringify(reason ? { reason } : {}),
  }, token);
}
