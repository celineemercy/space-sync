import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import ScanRoomScreen from "@/app/(app)/scan";

const mockReplace = jest.fn();
const mockRefetch = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ replace: mockReplace, back: jest.fn() }) }));
jest.mock("@/features/rooms/queries", () => ({ useRooms: () => ({ data: { rooms: [] }, refetch: mockRefetch }) }));
jest.mock("expo-camera", () => {
  const { View } = jest.requireActual("react-native");
  return { CameraView: (props: object) => <View testID="camera" {...props} />, useCameraPermissions: () => [{ granted: true }, jest.fn()] };
});

beforeEach(() => jest.clearAllMocks());

it("ignores repeated camera events while fetching a new room", async () => {
  let finish!: (value: unknown) => void;
  mockRefetch.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  const screen = await render(<ScanRoomScreen />);
  const scan = screen.getByTestId("camera").props.onBarcodeScanned;
  await act(async () => { scan({ data: "NEW-1" }); scan({ data: "NEW-1" }); });
  expect(mockRefetch).toHaveBeenCalledTimes(1);
  await act(async () => finish({ data: { rooms: [{ id: "new", code: "NEW-1" }], stale: false } }));
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith({ pathname: "/(app)/room/[id]", params: { id: "new" } }));
});

it("shows a refresh error for stale fallback data and allows another scan", async () => {
  mockRefetch.mockResolvedValue({ data: { rooms: [], stale: true } });
  const screen = await render(<ScanRoomScreen />);
  await fireEvent(screen.getByTestId("camera"), "barcodeScanned", { data: "NEW-1" });
  await waitFor(() => expect(screen.getByText(/Could not refresh rooms/)).toBeTruthy());
  await fireEvent.press(screen.getByText("Scan another code"));
  expect(screen.queryByText(/Could not refresh rooms/)).toBeNull();
});
