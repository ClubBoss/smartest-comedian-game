import { DisplayLobby } from "./display-lobby";

export default async function DisplayPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <DisplayLobby code={code.toUpperCase()} />;
}
