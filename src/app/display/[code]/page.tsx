import { ScreenWakeLock } from "@/components/screen-wake-lock";
import { DisplayLobby } from "./display-lobby";

export default async function DisplayPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return (
    <>
      <ScreenWakeLock />
      <DisplayLobby code={code.toUpperCase()} />
    </>
  );
}
