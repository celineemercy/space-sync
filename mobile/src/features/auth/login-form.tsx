import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/ui/app-button";
import { FormField } from "@/components/ui/form-field";
import { StatusMessage } from "@/components/ui/status-message";
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";
import { useAuth } from "@/providers/auth-provider";
import { loginSchema, type LoginInput } from "./validation";

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const { signIn } = useAuth();
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "student@example.test", password: "" },
  });

  const submit = handleSubmit(async ({ email, password }) => {
    try {
      await signIn(email, password);
      onSuccess();
    } catch (error) {
      setError("root", {
        message: error instanceof Error ? error.message : "Unable to sign in.",
      });
    }
  });

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Student sign in</Text>
      <Controller
        control={control}
        name="email"
        render={({ field: { onBlur, onChange, value } }) => (
          <FormField
            label="Email"
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            error={errors.email?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field: { onBlur, onChange, value } }) => (
          <FormField
            label="Password"
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
            secureTextEntry
            autoComplete="password"
            error={errors.password?.message}
          />
        )}
      />
      {errors.root?.message ? (
        <StatusMessage error={new Error(errors.root.message)} />
      ) : null}
      <AppButton
        label="Sign in"
        loading={isSubmitting}
        loadingLabel="Signing in..."
        onPress={submit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.lg,
  },
  cardTitle: { ...Typography.title, color: Colors.text },
});
