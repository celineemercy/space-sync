import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/auth-provider";
import { loadDailySchedule, SCHEDULE_TTL, upcomingScheduleDates } from "./schedule";

export function useRoomSchedule(roomId: string) {
  const { accessToken } = useAuth();
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(timer); }, []);
  const dates = upcomingScheduleDates(now);
  return useQuery({
    queryKey: ["room-schedule", roomId, dates[0]],
    enabled: Boolean(roomId && accessToken),
    queryFn: () => Promise.all(dates.map((date) => loadDailySchedule(roomId, date, accessToken))),
    staleTime: SCHEDULE_TTL, refetchInterval: SCHEDULE_TTL,
  });
}
