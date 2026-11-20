import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/ui/app-button";
import { ErrorState, LoadingState } from "@/components/ui/async-state";
import { Screen } from "@/components/ui/screen";
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";
import { useRooms } from "@/features/rooms/queries";
import { resolveScannedRoom } from "@/features/rooms/scan-code";

export default function ScanRoomScreen() {
  const router = useRouter();
  const rooms = useRooms();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanError, setScanError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scanLocked = useRef(false);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const [resolving, setResolving] = useState(false);

  const onScan = async (data: string) => {
    if (scanLocked.current || !active.current) return;
    scanLocked.current = true;
    setResolving(true);
    try {
    const room = await resolveScannedRoom(data, rooms.data?.rooms ?? [], async () => {
      const result = await rooms.refetch();
      if (result.error || !result.data || result.data.stale) throw new Error("Room refresh failed");
      return result.data.rooms;
    });
    if (!active.current) return;
    if (room) {
      router.replace({ pathname: "/(app)/room/[id]", params: { id: room.id } });
      return;
    }
    setScanError("This QR code does not match a space-sync room. Try another code.");
    } catch {
      if (active.current) setScanError("Could not refresh rooms. Check your connection and scan again.");
    } finally {
      if (active.current) setResolving(false);
    }
  };

  const retry = () => {
    scanLocked.current = false;
    setScanError(null);
  };

  return (
    <Screen contentContainerStyle={styles.content}>
      <Text style={styles.title}>Scan a room QR code</Text>
      <Text style={styles.help}>Scan a space-sync room label to open its details. You can still search rooms without camera access.</Text>
      {rooms.isLoading || !permission ? (
        <LoadingState label="Preparing room scanner..." />
      ) : rooms.error && !rooms.data ? (
        <ErrorState error={rooms.error} retrying={rooms.isFetching} onRetry={() => void rooms.refetch()} />
      ) : cameraError ? (
        <ErrorState error={new Error(cameraError)} onRetry={() => setCameraError(null)} />
      ) : !permission.granted ? (
        <View style={styles.panel}>
          <Text style={styles.help}>Camera permission is needed to scan the room label.</Text>
          <AppButton label={permission.canAskAgain ? "Allow camera" : "Open camera settings"} onPress={() => {
            if (permission.canAskAgain) void requestPermission();
            else void Linking.openSettings();
          }} />
        </View>
      ) : (
        <View style={styles.panel}>
          <View style={styles.cameraFrame} accessible accessibilityLabel="Camera viewfinder. Point at a room QR code.">
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={scanError || resolving ? undefined : ({ data }) => void onScan(data)}
              onMountError={({ message }) => setCameraError(message)}
            />
          </View>
          {scanError ? (
            <View style={styles.message}>
              <Text style={styles.help}>{scanError}</Text>
              <AppButton label="Scan another code" onPress={retry} />
            </View>
          ) : (
            <Text style={styles.help}>{resolving ? "Checking room code..." : "Point the camera at a room QR code."}</Text>
          )}
        </View>
      )}
      <AppButton label="Cancel scanning" variant="secondary" onPress={() => { active.current = false; router.back(); }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: Spacing.xl, gap: Spacing.lg },
  title: { ...Typography.headline, color: Colors.text },
  help: { ...Typography.body, color: Colors.textMuted },
  panel: { padding: Spacing.md, gap: Spacing.md, borderRadius: Radius.lg, backgroundColor: Colors.surface },
  cameraFrame: { height: 360, width: "100%", borderRadius: Radius.lg, overflow: "hidden" },
  camera: { flex: 1 },
  message: { gap: Spacing.md },
});
