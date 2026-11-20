import { fireEvent, render } from "@testing-library/react-native";
import { RoomScheduleSection } from "./room-schedule";
const mockRefetch = jest.fn();
let mockError: Error | null = null;
jest.mock("./schedule-queries", () => ({ useRoomSchedule: () => ({
  isLoading: false, error: mockError, refetch: mockRefetch, isFetching: false,
  data: [{ schedule: { date: "2030-01-01", items: [{ id: "c", kind: "class", startsAt: "2030-01-01T01:00:00Z", endsAt: "2030-01-01T02:00:00Z" }, { id: "r", kind: "reservation", startsAt: "2030-01-01T03:00:00Z", endsAt: "2030-01-01T04:00:00Z" }] }, stale: true, updatedAt: "2026-11-20T00:00:00Z" }],
}) }));
beforeEach(() => { mockError = null; mockRefetch.mockClear(); });
it("renders classes, confirmed reservations and stale-cache information without borrower names", async () => {
  const screen = await render(<RoomScheduleSection roomId="r" />);
  expect(screen.getByText("Upcoming Schedule")).toBeTruthy();
  expect(screen.getByText(/Class schedule ·/)).toBeTruthy();
  expect(screen.getByText(/Confirmed reservation ·/)).toBeTruthy();
  expect(screen.getByText(/offline/i)).toBeTruthy();
});
it("provides a retry when schedule loading fails", async () => {
  mockError = new Error("Schedule unavailable");
  const screen = await render(<RoomScheduleSection roomId="r" />);
  await fireEvent.press(screen.getByLabelText("Try again"));
  expect(mockRefetch).toHaveBeenCalledTimes(1);
});
