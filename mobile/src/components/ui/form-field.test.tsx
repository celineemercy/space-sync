import { render } from "@testing-library/react-native";
import { FormField } from "@/components/ui/form-field";

it("connects a validation error to its input", async () => {
  const screen = await render(<FormField label="Email" error="Enter a valid email." />);
  const input = screen.getByLabelText("Email");
  const error = screen.getByText("Enter a valid email.");

  expect(input.props["aria-invalid"]).toBe(true);
  expect(input.props["aria-describedby"]).toBe(error.props.nativeID);
  expect(input.props.accessibilityHint).toBe("Enter a valid email.");
});
