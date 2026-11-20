import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/ui/screen";
import { AppButton } from "@/components/ui/app-button";
import { ErrorState, LoadingState } from "@/components/ui/async-state";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { FormField } from "@/components/ui/form-field";
import { StatusMessage } from "@/components/ui/status-message";
import { Colors, Spacing, Typography } from "@/constants/theme";
import { decideRequest, getAdminRequest } from "@/features/admin/repository";
import { openPermissionDocument } from "@/features/admin/open-document";
import { useAuth } from "@/providers/auth-provider";
import { toCampusLabel } from "@/lib/date-time";
import { logRuntime } from "@/lib/runtime-log";

export default function AdminRequestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken, user } = useAuth();
  const router = useRouter();
  const client = useQueryClient();
  const [reason, setReason] = useState("");
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const query = useQuery({ queryKey: ["admin-request", id], enabled: user?.role === "ADMIN" && Boolean(id && accessToken), queryFn: () => getAdminRequest(accessToken!, id) });
  const mutation = useMutation({
    mutationFn: (value: "approve" | "reject") => decideRequest(accessToken!, id, value, reason),
    onSuccess: async () => {
      setDecision(null);
      await Promise.all([client.invalidateQueries({ queryKey: ["admin-requests"] }), client.invalidateQueries({ queryKey: ["admin-request", id] })]);
      router.back();
    },
    onError: () => { logRuntime("warn", "admin_decision_failed"); void query.refetch(); },
  });
  if (user?.role !== "ADMIN") return <Screen><Text>Admin access required.</Text></Screen>;
  if (query.isLoading) return <Screen><LoadingState label="Loading request..." /></Screen>;
  if (query.error || !query.data) return <Screen><ErrorState error={query.error} onRetry={() => void query.refetch()} /></Screen>;
  const item = query.data;
  return <Screen>
    <Text style={styles.title}>{item.room.name}</Text>
    <View style={styles.card}>
      <Text style={styles.label}>Student</Text><Text>{item.student.email}</Text>
      <Text style={styles.label}>Room and time</Text><Text>{item.room.code} · {item.room.location}</Text>
      <Text>{toCampusLabel(item.startsAt)} – {toCampusLabel(item.endsAt)}</Text>
      <Text style={styles.label}>Status</Text><Text>{item.status}</Text>
      {item.rejectionReason ? <Text>Reason: {item.rejectionReason}</Text> : null}
      <Text style={styles.label}>Permission document</Text>
      <AppButton label={`Open ${item.document?.name ?? "document"}`} variant="secondary" disabled={!item.document} onPress={async () => {
        try { setOpenError(null); await openPermissionDocument(accessToken!, id, item.document?.mime ?? "application/pdf"); }
        catch { logRuntime("warn", "document_open_failed"); setOpenError("Unable to open the document. Try again."); }
      }} />
      {openError ? <StatusMessage error={new Error(openError)} /> : null}
    </View>
    {mutation.error ? <StatusMessage error={mutation.error} /> : null}
    {item.status === "PENDING" ? <View style={styles.card}>
      <FormField label="Rejection reason" value={reason} onChangeText={setReason} maxLength={500} multiline placeholder="Required if rejecting" />
      <AppButton label="Approve request" onPress={() => { mutation.reset(); setDecision("approve"); }} />
      <AppButton label="Reject request" variant="danger" disabled={!reason.trim()} onPress={() => { mutation.reset(); setDecision("reject"); }} />
    </View> : null}
    <ConfirmationDialog visible={decision !== null} title={decision === "approve" ? "Approve this request?" : "Reject this request?"} description={`${item.room.name} · ${toCampusLabel(item.startsAt)} – ${toCampusLabel(item.endsAt)}. ${decision === "approve" ? `Confirm for ${item.student.email}?` : `Reason: ${reason.trim()}`}`} confirmLabel={decision === "approve" ? "Approve" : "Reject"} cancelLabel="Go back" tone={decision === "reject" ? "danger" : undefined} loading={mutation.isPending} error={mutation.error} onClose={() => setDecision(null)} onConfirm={() => { if (decision) mutation.mutate(decision); }} />
  </Screen>;
}

const styles = StyleSheet.create({
  title: { ...Typography.headline, color: Colors.text },
  card: { backgroundColor: Colors.surface, borderRadius: 16, padding: Spacing.lg, gap: Spacing.sm },
  label: { ...Typography.label, color: Colors.primary },
});
