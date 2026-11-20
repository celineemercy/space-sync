import { render } from "@testing-library/react-native";
import { ConfirmationDialog } from "./confirmation-dialog";

it("keeps a mutation error visible inside the open dialog", async () => {
  const screen = await render(
    <ConfirmationDialog visible title="Cancel reservation?" description="Confirm cancellation" confirmLabel="Cancel" error={new Error("The request failed. Try again.")} onConfirm={() => {}} onClose={() => {}} />,
  );
  expect(screen.getByText("The request failed. Try again.")).toBeTruthy();
  expect(screen.getByLabelText("Cancel")).toBeTruthy();
});
