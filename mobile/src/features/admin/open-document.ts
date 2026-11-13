import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import { Platform } from "react-native";

export async function openPermissionDocument(token: string, id: string, mime: string) {
  const url = `${process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "")}/reservations/${encodeURIComponent(id)}/document`;
  if (Platform.OS === "web") {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error("Unable to open the document.");
    const blobUrl = URL.createObjectURL(await response.blob());
    window.open(blobUrl, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    return;
  }
  const destination = `${FileSystem.cacheDirectory}permission-${encodeURIComponent(id)}${mime === "application/pdf" ? ".pdf" : mime === "image/png" ? ".png" : ".jpg"}`;
  const result = await FileSystem.downloadAsync(url, destination, { headers: { Authorization: `Bearer ${token}` } });
  if (result.status !== 200) throw new Error("Unable to open the document.");
  const contentUri = await FileSystem.getContentUriAsync(result.uri);
  await IntentLauncher.startActivityAsync("android.intent.action.VIEW", { data: contentUri, type: mime, flags: 1 });
}
