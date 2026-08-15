export default async function DisplayPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  return (
    <main className="stack">
      <h1>Shared Display</h1>
      <div className="card">Room code: {code.toUpperCase()}</div>
    </main>
  );
}
