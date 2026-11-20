import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/ui/screen";
import { AppButton } from "@/components/ui/app-button";
import { ErrorState, LoadingState } from "@/components/ui/async-state";
import { FormField } from "@/components/ui/form-field";
import { StatusMessage } from "@/components/ui/status-message";
import { Colors, Spacing, Typography } from "@/constants/theme";
import { decideRequest, getAdminStats, listAdminRequests } from "@/features/admin/repository";
import { useAuth } from "@/providers/auth-provider";
import { toCampusLabel } from "@/lib/date-time";

const statuses = ["PENDING", "CONFIRMED", "REJECTED", "EXPIRED", "CANCELLED", "HISTORY", "ALL"] as const;
type Decision = { id: string; decision: "approve" | "reject"; reason?: string };

export default function AdminScreen() {
  const { accessToken, user, signOut } = useAuth();
  const router = useRouter();
  const client = useQueryClient();
  const [status, setStatus] = useState<string>("PENDING");
  const [account, setAccount] = useState(false);
  const [page, setPage] = useState(1);
  const [date, setDate] = useState("");
  const [draftDate, setDraftDate] = useState("");
  const [dateError, setDateError] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const enabled = user?.role === "ADMIN" && !account && Boolean(accessToken);
  const query = useQuery({
    queryKey: ["admin-requests", user?.id, status, date, page], enabled,
    queryFn: () => listAdminRequests(accessToken!, status === "ALL" ? undefined : status, page, date || undefined),
  });
  const stats = useQuery({
    queryKey: ["admin-stats", user?.id], enabled,
    queryFn: () => getAdminStats(accessToken!),
  });
  const decision = useMutation({
    mutationFn: (input: Decision) => decideRequest(accessToken!, input.id, input.decision, input.reason),
    onSuccess: async () => {
      setRejectingId(null); setReason("");
      await Promise.all(["admin-requests", "admin-stats", "admin-request", "reservations", "room-schedule"].map((key) => client.invalidateQueries({ queryKey: [key] })));
    },
  });
  const applyDate = () => {
    const value = draftDate.trim();
    const parsed = new Date(`${value}T00:00:00Z`);
    if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value)) {
      setDateError("Use a valid date in YYYY-MM-DD format."); return;
    }
    setDateError(""); setDate(value); setPage(1);
  };
  if (user?.role !== "ADMIN") return <Screen><Text>Admin access required.</Text></Screen>;
  return (
    <Screen>
      <Text style={styles.title}>Admin dashboard</Text>
      <View style={styles.tabs}>
        <AppButton label="Requests" variant={account ? "secondary" : "primary"} onPress={() => setAccount(false)} style={styles.tab} />
        <AppButton label="Account" variant={account ? "primary" : "secondary"} onPress={() => setAccount(true)} style={styles.tab} />
      </View>
      {account ? <View style={styles.card}><Text>{user.email}</Text><AppButton label="Sign out" variant="secondary" onPress={() => void signOut()} /></View> : <>
        <Text style={styles.count}>Campus time · Asia/Jakarta</Text>
        {stats.isLoading ? <LoadingState label="Loading statistics..." /> : stats.error ? <ErrorState error={stats.error} onRetry={() => void stats.refetch()} /> : stats.data ? (
          <View style={styles.stats}>
            <View style={styles.card}><Text>Pending today</Text><Text style={styles.room}>{stats.data.pendingToday}</Text></View>
            <View style={styles.card}><Text>Confirmed this week</Text><Text style={styles.room}>{stats.data.confirmedThisWeek}</Text></View>
            <View style={styles.card}><Text>Busiest room this week</Text><Text style={styles.room}>{stats.data.busiestRoom ? `${stats.data.busiestRoom.code} · ${stats.data.busiestRoom.name}` : "No confirmed bookings"}</Text>{stats.data.busiestRoom ? <Text>{stats.data.busiestRoom.bookings} bookings</Text> : null}</View>
          </View>
        ) : null}
        <View style={styles.filters}>{statuses.map((value) => <AppButton key={value} label={value === "ALL" ? "All statuses" : value === "HISTORY" ? "History" : value.charAt(0) + value.slice(1).toLowerCase()} variant={status === value ? "primary" : "secondary"} onPress={() => { setStatus(value); setPage(1); }} />)}</View>
        <FormField label="Reservation date (YYYY-MM-DD)" value={draftDate} onChangeText={setDraftDate} placeholder="All dates" error={dateError || undefined} />
        <View style={styles.tabs}>
          <AppButton label="Apply date" onPress={applyDate} style={styles.tab} />
          <AppButton label="Clear date" variant="secondary" onPress={() => { setDraftDate(""); setDate(""); setDateError(""); setPage(1); }} style={styles.tab} />
        </View>
        {query.isLoading ? <LoadingState label="Loading requests..." /> : query.error ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : <>
          <Text style={styles.count}>{query.data?.total ?? 0} {status === "PENDING" ? "awaiting review" : "requests"}</Text>
          {query.data?.items.length ? query.data.items.map((item) => <View key={item.id} style={styles.card}>
            <Text style={styles.room}>{item.room.name}</Text>
            <Text>{item.room.code} · {toCampusLabel(item.startsAt)}</Text>
            <Text>{item.student.email} · {item.status}</Text>
            <Text>Submitted {toCampusLabel(item.createdAt)}</Text>
            <AppButton label={`Review ${item.room.name}`} onPress={() => router.push({ pathname: "/(app)/admin-request/[id]", params: { id: item.id } })} />
            {item.status === "PENDING" ? <>
              <View style={styles.tabs}>
                <AppButton label={`Approve ${item.room.code}`} disabled={decision.isPending} loading={decision.isPending && decision.variables?.id === item.id && decision.variables.decision === "approve"} onPress={() => { decision.reset(); decision.mutate({ id: item.id, decision: "approve" }); }} style={styles.tab} />
                <AppButton label={`Reject ${item.room.code}`} disabled={decision.isPending} variant="danger" onPress={() => { decision.reset(); setRejectingId(item.id); setReason(""); }} style={styles.tab} />
              </View>
              {rejectingId === item.id ? <>
                <FormField label={`Rejection reason for ${item.room.code}`} value={reason} onChangeText={setReason} maxLength={500} multiline placeholder="Required if rejecting" />
                <AppButton label="Confirm rejection" disabled={decision.isPending || !reason.trim()} loading={decision.isPending && decision.variables?.id === item.id} variant="danger" onPress={() => decision.mutate({ id: item.id, decision: "reject", reason: reason.trim() })} />
                <AppButton label="Cancel rejection" variant="secondary" disabled={decision.isPending} onPress={() => setRejectingId(null)} />
              </> : null}
              {decision.error && decision.variables?.id === item.id ? <StatusMessage error={decision.error} /> : null}
            </> : null}
          </View>) : <Text style={styles.empty}>No requests in this section.</Text>}
          <View style={styles.tabs}>
            {page > 1 ? <AppButton label="Previous" variant="secondary" onPress={() => setPage((value) => value - 1)} style={styles.tab} /> : null}
            {(query.data?.total ?? 0) > page * 20 ? <AppButton label="Next" variant="secondary" onPress={() => setPage((value) => value + 1)} style={styles.tab} /> : null}
          </View>
        </>}
      </>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...Typography.headline, color: Colors.text },
  tabs: { flexDirection: "row", gap: Spacing.sm },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  stats: { gap: Spacing.sm },
  tab: { flex: 1 },
  card: { backgroundColor: Colors.surface, padding: Spacing.lg, gap: Spacing.sm, borderRadius: 16 },
  room: { ...Typography.title, color: Colors.text },
  count: { ...Typography.label, color: Colors.primary },
  empty: { ...Typography.body, color: Colors.textMuted },
});
