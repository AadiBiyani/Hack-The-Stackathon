export default function Home() {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <h1>Clinical Trial Matcher Gateway</h1>
      <p>Use POST /api/match with body {`{ "patient_id": "..." }`} to run the matching agent.</p>
    </main>
  );
}
