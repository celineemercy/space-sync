import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/ui/app-button";
import { ErrorState, LoadingState } from "@/components/ui/async-state";
import { Screen } from "@/components/ui/screen";
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";
import { useRooms } from "@/features/rooms/queries";
import { findScannedRoom } from "@/features/rooms/scan-code";

export default function ScanRoomScreen() {
  const router = useRouter();
  const rooms = useRooms();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanError, setScanError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scanLocked = useRef(false);

  const onScan = (data: string) => {
    if (scanLocked.current) return;
    scanLocked.current = true;
    const room = findScannedRoom(data, rooms.data?.rooms ?? []);
    if (room) {
      router.replace({ pathname: "/(app)/room/[id]", params: { id: room.id } });
      return;
    }
    setScanError("This QR code does not match a CampusSpace room. Try another code.");
  };

  const retry = () => {
    scanLocked.current = false;
    setScanError(null);
  };

  return (
    <Screen contentContainerStyle={styles.content}>
      <Text style={styles.title}>Scan a room QR code</Text>
      <Text style={styles.help}>Scan a CampusSpace room label to open its details. You can still search rooms without camera access.</Text>
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
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={scanError ? undefined : ({ data }) => onScan(data)}
            onMountError={({ message }) => setCameraError(message)}
          />
          {scanError ? (
            <View style={styles.message}>
              <Text style={styles.help}>{scanError}</Text>
              <AppButton label="Scan another code" onPress={retry} />
            </View>
          ) : (
            <Text style={styles.help}>Point the camera at a room QR code.</Text>
          )}
        </View>
      )}
      <AppButton label="Cancel scanning" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: Spacing.xl, gap: Spacing.lg },
  title: { ...Typography.headline, color: Colors.text },
  help: { ...Typography.body, color: Colors.textMuted },
  panel: { padding: Spacing.md, gap: Spacing.md, borderRadius: Radius.lg, backgroundColor: Colors.surface },
  camera: { height: 360, borderRadius: Radius.lg, overflow: "hidden" },
  message: { gap: Spacing.md },
});
