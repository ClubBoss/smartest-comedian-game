export default async function PlayerPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  return (
    <main className="stack">
      <h1>Player</h1>
      <div className="card">Room code: {code.toUpperCase()}</div>
    </main>
  );
}
