export const config = { maxDuration: 10 };

export function GET() {
  return new Response(
    JSON.stringify({ ok: true, message: "test works", time: new Date().toISOString() }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

export default GET;
