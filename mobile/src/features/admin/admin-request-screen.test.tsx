import { fireEvent, render } from "@testing-library/react-native";
import AdminRequestScreen from "@/app/(app)/admin-request/[id]";

const mockMutate = jest.fn();
const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "request-1" }),
  useRouter: () => ({ back: mockBack }),
}));
jest.mock("@/providers/auth-provider", () => ({
  useAuth: () => ({ accessToken: "token", user: { id: "admin", email: "admin@example.test", role: "ADMIN" } }),
}));
jest.mock("@/features/admin/open-document", () => ({ openPermissionDocument: jest.fn() }));
jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
  useQuery: () => ({ isLoading: false, error: null, refetch: jest.fn(), data: {
    id: "request-1", status: "PENDING", startsAt: "2030-01-01T09:00:00.000Z", endsAt: "2030-01-01T10:00:00.000Z",
    room: { id: "room-1", code: "A1", name: "Study Room", location: "Building A", capacity: 8 },
    student: { id: "student-1", email: "student@example.test" },
    document: { name: "permit.pdf", mime: "application/pdf", size: 100 },
  } }),
  useMutation: () => ({ mutate: mockMutate, reset: jest.fn(), isPending: false, error: null }),
}));

it("requires a reason before the admin can confirm rejection", async () => {
  const screen = await render(<AdminRequestScreen />);
  const reject = screen.getByLabelText("Reject request");
  expect(reject.props.accessibilityState?.disabled).toBe(true);
  await fireEvent.changeText(screen.getByPlaceholderText("Required if rejecting"), "Missing signature");
  await fireEvent.press(screen.getByLabelText("Reject request"));
  expect(screen.getByText("Reject this request?")).toBeTruthy();
  expect(screen.getByText(/Reason: Missing signature/)).toBeTruthy();
  await fireEvent.press(screen.getByLabelText("Reject"));
  expect(mockMutate).toHaveBeenCalledWith("reject");
});
