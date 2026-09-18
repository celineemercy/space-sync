import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import { AppButton } from "@/components/ui/app-button";
import { FormField } from "@/components/ui/form-field";
import { Screen } from "@/components/ui/screen";
import { StatusMessage } from "@/components/ui/status-message";
import { Colors, Radius, Spacing } from "@/constants/theme";
import { useAuth } from "@/providers/auth-provider";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must contain at least 8 characters."),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "student@example.test", password: "" },
  });

  const submit = handleSubmit(async (values) => {
    try {
      await signIn(values.email, values.password);
      router.replace("/(app)/(tabs)/search");
    } catch (error) {
      setError("root", {
        message: error instanceof Error ? error.message : "Unable to sign in.",
      });
    }
  });

  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.hero}>
        <View style={styles.mark}>
          <Text style={styles.markText}>CS</Text>
        </View>
        <Text style={styles.title}>CampusSpace</Text>
        <Text style={styles.subtitle}>
          Find and reserve the right campus room.
        </Text>
      </View>

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
        <AppButton label="Sign in" loading={isSubmitting} onPress={submit} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: Spacing.xxl,
  },
  hero: { alignItems: "center", gap: Spacing.sm },
  mark: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  markText: { color: "#FFFFFF", fontSize: 24, fontWeight: "900" },
  title: { color: Colors.text, fontSize: 32, fontWeight: "900" },
  subtitle: { color: Colors.textMuted, fontSize: 16, textAlign: "center" },
  card: {
    backgroundColor: Colors.surface,
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.lg,
  },
  cardTitle: { color: Colors.text, fontSize: 20, fontWeight: "800" },
});
