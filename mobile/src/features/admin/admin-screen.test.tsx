import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminScreen from "@/app/(app)/admin";
import { decideRequest, getAdminStats, listAdminRequests } from "./repository";

const mockPush = jest.fn();
let mockRole = "ADMIN";
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("@/providers/auth-provider", () => ({
  useAuth: () => ({ accessToken: "token", user: { id: "admin", email: "admin@example.test", role: mockRole }, signOut: jest.fn() }),
}));
jest.mock("./repository", () => ({ decideRequest: jest.fn(), getAdminStats: jest.fn(), listAdminRequests: jest.fn() }));
const clients: QueryClient[] = [];
const request = {
  id: "request-1", status: "PENDING", startsAt: "2030-01-01T09:00:00Z", endsAt: "2030-01-01T10:00:00Z", createdAt: "2029-12-01T09:00:00Z",
  room: { id: "room-1", code: "A1", name: "Study Room", location: "Building A", capacity: 8 },
  student: { id: "student-1", email: "student@example.test" },
};
beforeEach(() => {
  jest.clearAllMocks(); mockRole = "ADMIN";
  jest.mocked(listAdminRequests).mockResolvedValue({ items: [request], total: 1, page: 1 } as never);
  jest.mocked(getAdminStats).mockResolvedValue({ pendingToday: 2, confirmedThisWeek: 5, busiestRoom: { code: "A1", name: "Study Room", bookings: 3 } } as never);
  jest.mocked(decideRequest).mockResolvedValue({ ...request, status: "CONFIRMED" } as never);
});
afterEach(() => { clients.forEach((client) => client.clear()); clients.length = 0; });
async function renderAdmin() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } });
  clients.push(client);
  return render(<QueryClientProvider client={client}><AdminScreen /></QueryClientProvider>);
}

it("shows dashboard statistics and preserves the detailed review link", async () => {
  const screen = await renderAdmin();
  await waitFor(() => expect(screen.getByText("student@example.test · PENDING")).toBeTruthy());
  expect(screen.getByText("Pending today")).toBeTruthy();
  expect(screen.getByText("Confirmed this week")).toBeTruthy();
  expect(screen.getByText("A1 · Study Room")).toBeTruthy();
  await fireEvent.press(screen.getByLabelText("Review Study Room"));
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/(app)/admin-request/[id]", params: { id: "request-1" } });
});

it("approves inline and refreshes the list and statistics", async () => {
  const screen = await renderAdmin();
  await waitFor(() => expect(screen.getByLabelText("Approve A1")).toBeTruthy());
  await fireEvent.press(screen.getByLabelText("Approve A1"));
  await waitFor(() => expect(decideRequest).toHaveBeenCalledWith("token", "request-1", "approve", undefined));
  await waitFor(() => expect(getAdminStats).toHaveBeenCalledTimes(2));
  expect(listAdminRequests).toHaveBeenCalledTimes(2);
});

it("requires a rejection reason and keeps failed inline rejection retryable", async () => {
  jest.mocked(decideRequest).mockRejectedValueOnce(new Error("Try the decision again"));
  const screen = await renderAdmin();
  await waitFor(() => expect(screen.getByLabelText("Reject A1")).toBeTruthy());
  await fireEvent.press(screen.getByLabelText("Reject A1"));
  expect(screen.getByLabelText("Confirm rejection").props.accessibilityState.disabled).toBe(true);
  await fireEvent.changeText(screen.getByLabelText("Rejection reason for A1"), " Missing signature ");
  await fireEvent.press(screen.getByLabelText("Confirm rejection"));
  await waitFor(() => expect(screen.getByText("Try the decision again")).toBeTruthy());
  expect(screen.getByLabelText("Rejection reason for A1").props.value).toBe(" Missing signature ");
  expect(decideRequest).toHaveBeenCalledWith("token", "request-1", "reject", "Missing signature");
});

it("filters status and campus date and rejects impossible dates", async () => {
  const screen = await renderAdmin();
  await waitFor(() => expect(screen.getByLabelText("Confirmed")).toBeTruthy());
  await fireEvent.press(screen.getByLabelText("Confirmed"));
  await waitFor(() => expect(listAdminRequests).toHaveBeenLastCalledWith("token", "CONFIRMED", 1, undefined));
  await fireEvent.changeText(screen.getByLabelText("Reservation date (YYYY-MM-DD)"), "2026-11-20");
  await fireEvent.press(screen.getByLabelText("Apply date"));
  await waitFor(() => expect(listAdminRequests).toHaveBeenLastCalledWith("token", "CONFIRMED", 1, "2026-11-20"));
  await fireEvent.changeText(screen.getByLabelText("Reservation date (YYYY-MM-DD)"), "2026-02-30");
  await fireEvent.press(screen.getByLabelText("Apply date"));
  expect(screen.getByText("Use a valid date in YYYY-MM-DD format.")).toBeTruthy();
});

it("does not fetch administrative data for a student", async () => {
  mockRole = "STUDENT";
  const screen = await renderAdmin();
  expect(screen.getByText("Admin access required.")).toBeTruthy();
  expect(getAdminStats).not.toHaveBeenCalled();
  expect(listAdminRequests).not.toHaveBeenCalled();
});
