import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import api from "./api";
import { getCampaignRouteFromData } from "./communication-center";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    // Push tokens only work on physical devices
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#f97316",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();

  return tokenData.data;
}

export async function syncPushToken(): Promise<void> {
  try {
    const token = await registerForPushNotificationsAsync();
    if (token) {
      await api.patch("/auth/push-token", { token });
    }
  } catch {
    // Non-fatal — app works fine without push
  }
}

export async function clearPushToken(): Promise<void> {
  try {
    await api.patch("/auth/push-token/clear");
  } catch {
    // best-effort
  }
}

export function getNotificationRoute(
  data: Record<string, any> | undefined
): string | null {
  if (!data) return null;
  const communicationRoute = getCampaignRouteFromData(data);
  if (communicationRoute) return communicationRoute;
  const screen = data.screen as string | undefined;
  if (screen === "tournament" && data.tournamentId) {
    return `/game/tournament/${data.tournamentId}`;
  }
  if (screen === "profile") {
    if (data.followerId) return `/game/player/${data.followerId}`;
    if (data.friendId) return `/game/player/${data.friendId}`;
    return "/profile";
  }
  if (data.type === "WELCOME") {
    return "/";
  }
  if (data.type === "PUZZLE_RELEASED") {
    if (data.puzzleId) return `/game/puzzle-player?id=${data.puzzleId}`;
    return "/game/puzzles";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Dev preview — cycles through all 9 notification types
// ---------------------------------------------------------------------------

const PREVIEW_SAMPLES = [
  {
    type: "TOURNAMENT_REGISTERED",
    title: "Registration Confirmed",
    body: 'You are registered for "Summer Cup 2026".',
  },
  {
    type: "TOURNAMENT_STARTED",
    title: "Summer Cup 2026 has started!",
    body: "Round 1 is now live with 8 matches.",
  },
  {
    type: "MATCH_ASSIGNED",
    title: "Match vs Juma",
    body: 'Your Round 2 match in "Summer Cup 2026" is ready. Open the app to play!',
  },
  {
    type: "MATCH_STARTED",
    title: "Your match has begun",
    body: "Juma has joined. It's your turn — good luck!",
  },
  {
    type: "MATCH_RESULT",
    title: "You won!",
    body: 'You won your Round 2 match in "Summer Cup 2026" (2-0). You advance!',
  },
  {
    type: "ROUND_ADVANCED",
    title: "Round 3 is live",
    body: 'Quarter-finals have started in "Summer Cup 2026".',
  },
  {
    type: "ELIMINATED",
    title: "Eliminated",
    body: 'You were eliminated from "Summer Cup 2026" in Round 3 (1-2).',
  },
  {
    type: "TOURNAMENT_COMPLETED",
    title: "Summer Cup 2026 has ended",
    body: "Champion: Amina. Thanks for participating!",
  },
  {
    type: "TOURNAMENT_CANCELLED",
    title: "Summer Cup 2026 was cancelled",
    body: "The tournament has been cancelled by an admin.",
  },
  {
    type: "ADMIN_PROMOTION",
    title: "Weekend Tournament Live!",
    body: "Mobile players can join the blitz bracket right now.",
  },
  {
    type: "ADMIN_ALERT",
    title: "Maintenance at midnight",
    body: "Queues pause briefly tonight while we ship a stability hotfix.",
  },
] as const;

let previewIndex = 0;

export async function sendPreviewNotification(): Promise<{
  type: string;
  title: string;
  body: string;
}> {
  const sample = PREVIEW_SAMPLES[previewIndex % PREVIEW_SAMPLES.length];
  previewIndex += 1;

  const { status } = await Notifications.getPermissionsAsync();
  if (status === "granted") {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: sample.title,
        body: sample.body,
        sound: true,
        data:
          sample.type === "ADMIN_PROMOTION"
            ? { type: sample.type, href: "/game/tournaments", screen: "notifications" }
            : sample.type === "ADMIN_ALERT"
            ? { type: sample.type, href: "/support", screen: "support" }
            : { type: sample.type, screen: "tournament", tournamentId: "preview" },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1 },
    });
  }

  return sample;
}
