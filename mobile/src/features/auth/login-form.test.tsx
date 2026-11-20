import { fireEvent, render, waitFor } from "@testing-library/react-native";
import LoginScreen from "@/app/(auth)/login";

const mockReplace = jest.fn();
const mockSignIn = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));
jest.mock("@/providers/auth-provider", () => ({
  useAuth: () => ({ signIn: mockSignIn }),
}));

beforeEach(() => {
  mockReplace.mockReset();
  mockSignIn.mockReset();
});

it("shows validation errors without calling the API", async () => {
  const screen = await render(<LoginScreen />);
  await fireEvent.changeText(screen.getByLabelText("Email"), "bad-email");
  await fireEvent.changeText(screen.getByLabelText("Password"), "short");
  await fireEvent.press(screen.getByLabelText("Sign in"));

  expect(await screen.findByText("Enter a valid email address.")).toBeTruthy();
  expect(screen.getByText("Password must contain at least 8 characters.")).toBeTruthy();
  expect(mockSignIn).not.toHaveBeenCalled();
});

it("navigates after a successful sign in", async () => {
  mockSignIn.mockResolvedValueOnce({ id: "student", email: "student@example.test", role: "STUDENT" });
  const screen = await render(<LoginScreen />);
  await fireEvent.changeText(screen.getByLabelText("Password"), "password123");
  await fireEvent.press(screen.getByLabelText("Sign in"));

  await waitFor(() => expect(mockSignIn).toHaveBeenCalledWith("student@example.test", "password123"));
  expect(mockReplace).toHaveBeenCalledWith("/(app)/(tabs)/search");
});

it("sends an admin to the review queue", async () => {
  mockSignIn.mockResolvedValueOnce({ id: "admin", email: "admin@example.test", role: "ADMIN" });
  const screen = await render(<LoginScreen />);
  await fireEvent.changeText(screen.getByLabelText("Password"), "password123");
  await fireEvent.press(screen.getByLabelText("Sign in"));
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/(app)/admin"));
});

it("shows a sign in failure and stays on the form", async () => {
  mockSignIn.mockRejectedValueOnce(new Error("Invalid credentials."));
  const screen = await render(<LoginScreen />);
  await fireEvent.changeText(screen.getByLabelText("Password"), "password123");
  await fireEvent.press(screen.getByLabelText("Sign in"));

  expect(await screen.findByText("Invalid credentials.")).toBeTruthy();
  expect(mockReplace).not.toHaveBeenCalled();
});
