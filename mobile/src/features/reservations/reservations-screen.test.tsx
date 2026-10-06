import { fireEvent, render } from "@testing-library/react-native";
import ReservationsScreen from "@/app/(app)/(tabs)/reservations";
import type { Reservation } from "@/types/domain";

const mockRefetchReservations = jest.fn();
const mockReservationsQuery: {
  data:
    | {
        reservations: Reservation[];
        stale: boolean;
        updatedAt: string | null;
      }
    | undefined;
  error: Error | null;
  isLoading: boolean;
  isFetching: boolean;
  refetch: jest.Mock;
} = {
  data: undefined,
  error: null,
  isLoading: false,
  isFetching: false,
  refetch: mockRefetchReservations,
};
const mockCancellation: {
  error: Error | null;
  isPending: boolean;
  variables: string | undefined;
  mutateAsync: jest.Mock;
  reset: jest.Mock;
} = {
  error: null,
  isPending: false,
  variables: undefined,
  mutateAsync: jest.fn(),
  reset: jest.fn(),
};

const confirmedReservation: Reservation = {
  id: "reservation-1",
  startsAt: "2030-01-01T02:00:00.000Z",
  endsAt: "2030-01-01T03:00:00.000Z",
  status: "CONFIRMED",
  cancelledAt: null,
  createdAt: "2029-12-01T00:00:00.000Z",
  room: {
    id: "room-1",
    code: "A1",
    name: "Campus Room",
    location: "Main building",
    capacity: 10,
  },
};

jest.mock("@/providers/auth-provider", () => ({
  useAuth: () => ({ user: { id: "user", email: "student@example.test" } }),
}));
jest.mock("@/features/reservations/queries", () => ({
  useReservations: () => mockReservationsQuery,
  useCancelReservation: () => mockCancellation,
}));

beforeEach(() => {
  mockReservationsQuery.data = {
    reservations: [confirmedReservation],
    stale: false,
    updatedAt: null,
  };
  mockReservationsQuery.error = null;
  mockReservationsQuery.isLoading = false;
  mockReservationsQuery.isFetching = false;
  mockCancellation.error = null;
  mockCancellation.isPending = false;
  mockCancellation.variables = undefined;
  mockCancellation.mutateAsync.mockReset();
  mockCancellation.reset.mockReset();
  mockRefetchReservations.mockReset();
});

describe("ReservationsScreen primary states", () => {
  it("renders the initial loading state", async () => {
    mockReservationsQuery.data = undefined;
    mockReservationsQuery.isLoading = true;
    const screen = await render(<ReservationsScreen />);
    expect(screen.getByLabelText("Loading your reservations...")).toBeTruthy();
  });

  it("renders reservations after data loads", async () => {
    const screen = await render(<ReservationsScreen />);
    expect(screen.getByText("Campus Room")).toBeTruthy();
    expect(screen.getByText("CONFIRMED")).toBeTruthy();
  });

  it("renders the empty state", async () => {
    mockReservationsQuery.data = {
      reservations: [],
      stale: false,
      updatedAt: null,
    };
    const screen = await render(<ReservationsScreen />);
    expect(
      screen.getByText("You do not have an active reservation yet."),
    ).toBeTruthy();
    expect(
      screen.getByText("Cancelled reservations will appear here."),
    ).toBeTruthy();
  });

  it("renders an error and retries the reservations query", async () => {
    mockReservationsQuery.data = undefined;
    mockReservationsQuery.error = new Error(
      "Reservations could not be loaded.",
    );
    const screen = await render(<ReservationsScreen />);
    await fireEvent.press(screen.getByLabelText("Try again"));
    expect(screen.getByText("Reservations could not be loaded.")).toBeTruthy();
    expect(mockRefetchReservations).toHaveBeenCalledTimes(1);
  });

  it("disables cancellation controls while submit is pending", async () => {
    const screen = await render(<ReservationsScreen />);

    await fireEvent.press(screen.getByLabelText("Cancel reservation"));
    mockCancellation.isPending = true;
    mockCancellation.variables = confirmedReservation.id;
    await screen.rerender(<ReservationsScreen />);
    const pendingControls = screen.getAllByLabelText("Cancel reservation");
    expect(
      pendingControls.every(
        (control) => control.props.accessibilityState?.disabled === true,
      ),
    ).toBe(true);

    await fireEvent.press(pendingControls.at(-1)!);
    expect(mockCancellation.mutateAsync).not.toHaveBeenCalled();
  });
});
