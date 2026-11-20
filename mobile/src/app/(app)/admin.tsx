import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/ui/screen";
import { AppButton } from "@/components/ui/app-button";
import { ErrorState, LoadingState } from "@/components/ui/async-state";
import { Colors, Spacing, Typography } from "@/constants/theme";
import { listAdminRequests } from "@/features/admin/repository";
import { useAuth } from "@/providers/auth-provider";
import { toCampusLabel } from "@/lib/date-time";

export default function AdminScreen() {
  const { accessToken, user, signOut } = useAuth();
  const router = useRouter();
  const [section, setSection] = useState<"PENDING" | "history" | "account">("PENDING");
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["admin-requests", section, page],
    enabled: user?.role === "ADMIN" && section !== "account" && Boolean(accessToken),
    queryFn: () => listAdminRequests(accessToken!, section === "PENDING" ? "PENDING" : "HISTORY", page),
  });
  if (user?.role !== "ADMIN") return <Screen><Text>Admin access required.</Text></Screen>;
  const items = query.data?.items;
  return (
    <Screen>
      <Text style={styles.title}>Request review</Text>
      <View style={styles.tabs}>
        <AppButton label="Pending" variant={section === "PENDING" ? "primary" : "secondary"} onPress={() => { setSection("PENDING"); setPage(1); }} style={styles.tab} />
        <AppButton label="History" variant={section === "history" ? "primary" : "secondary"} onPress={() => { setSection("history"); setPage(1); }} style={styles.tab} />
        <AppButton label="Account" variant={section === "account" ? "primary" : "secondary"} onPress={() => setSection("account")} style={styles.tab} />
      </View>
      {section === "account" ? <View style={styles.card}><Text>{user.email}</Text><AppButton label="Sign out" variant="secondary" onPress={() => void signOut()} /></View>
        : query.isLoading ? <LoadingState label="Loading requests..." />
        : query.error ? <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        : <>
          <Text style={styles.count}>{section === "PENDING" ? `${query.data?.total ?? 0} awaiting review` : "Past requests"}</Text>
          {items?.length ? items.map((item) => <View key={item.id} style={styles.card}>
            <Text style={styles.room}>{item.room.name}</Text>
            <Text>{item.room.code} · {toCampusLabel(item.startsAt)}</Text>
            <Text>{item.student.email} · {item.status}</Text>
            <Text>Submitted {toCampusLabel(item.createdAt)}</Text>
            <AppButton label={`Review ${item.room.name}`} onPress={() => router.push({ pathname: "/(app)/admin-request/[id]", params: { id: item.id } })} />
          </View>) : <Text style={styles.empty}>No requests in this section.</Text>}
          <View style={styles.tabs}>
            {page > 1 ? <AppButton label="Previous" variant="secondary" onPress={() => setPage((value) => value - 1)} style={styles.tab} /> : null}
            {(query.data?.total ?? 0) > page * 20 ? <AppButton label="Next" variant="secondary" onPress={() => setPage((value) => value + 1)} style={styles.tab} /> : null}
          </View>
        </>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...Typography.headline, color: Colors.text },
  tabs: { flexDirection: "row", gap: Spacing.sm },
  tab: { flex: 1 },
  card: { backgroundColor: Colors.surface, padding: Spacing.lg, gap: Spacing.sm, borderRadius: 16 },
  room: { ...Typography.title, color: Colors.text },
  count: { ...Typography.label, color: Colors.primary },
  empty: { ...Typography.body, color: Colors.textMuted },
});
