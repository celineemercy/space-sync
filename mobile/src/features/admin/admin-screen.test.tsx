import { fireEvent, render } from "@testing-library/react-native";
import AdminScreen from "@/app/(app)/admin";

const mockPush = jest.fn();
const mockRefetch = jest.fn();
const mockSignOut = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("@/providers/auth-provider", () => ({
  useAuth: () => ({ accessToken: "token", user: { id: "admin", email: "admin@example.test", role: "ADMIN" }, signOut: mockSignOut }),
}));
jest.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ isLoading: false, error: null, refetch: mockRefetch, data: { total: 1, page: 1, items: [{
    id: "request-1", status: "PENDING", startsAt: "2030-01-01T09:00:00.000Z", createdAt: "2029-12-01T09:00:00.000Z",
    room: { id: "room-1", code: "A1", name: "Study Room", location: "Building A", capacity: 8 },
    student: { id: "student-1", email: "student@example.test" },
  }] } }),
}));

it("shows a pending request and opens its review", async () => {
  const screen = await render(<AdminScreen />);
  expect(screen.getByText("student@example.test · PENDING")).toBeTruthy();
  await fireEvent.press(screen.getByLabelText("Review Study Room"));
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/(app)/admin-request/[id]", params: { id: "request-1" } });
});
