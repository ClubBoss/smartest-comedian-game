import { ScreenWakeLock } from "@/components/screen-wake-lock";
import { HostRoomManager } from "./host-room-manager";
import { HostSafetyDock } from "./host-safety-dock";
import { HostTournamentDock } from "./host-tournament-dock";

export default function HostPage() {
  return (
    <>
      <ScreenWakeLock />
      <HostSafetyDock />
      <HostTournamentDock />
      <HostRoomManager />
    </>
  );
}
