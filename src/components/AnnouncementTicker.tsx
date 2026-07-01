import { useQuery } from "@tanstack/react-query";
import { listActiveAnnouncements } from "@/lib/announcements.functions";
import { Megaphone } from "lucide-react";

export function AnnouncementTicker() {
  const { data } = useQuery({
    queryKey: ["announcements"],
    queryFn: () => listActiveAnnouncements(),
    refetchInterval: 60_000,
  });

  const items = data ?? [];
  if (items.length === 0) return null;

  // Duplicate for seamless loop
  const loopText = items.map((a: any) => a.message).join("   ★   ");

  return (
    <div className="announcement-ticker relative overflow-hidden rounded-2xl">
      <div className="flex items-center gap-2 relative z-10">
        <div className="announcement-badge shrink-0 pl-3 pr-2 py-2 flex items-center gap-1.5">
          <Megaphone className="w-3.5 h-3.5 text-white animate-pulse" />
          <span className="text-[10px] font-black text-white tracking-widest uppercase">ঘোষণা</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="ticker-track whitespace-nowrap py-2 pr-8 text-sm font-bold">
            <span className="ticker-text">{loopText}   ★   {loopText}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
