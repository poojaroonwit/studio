const endpoint = process.env.BROADCAST_SCHEDULER_URL;
const apiKey = process.env.AUTOMATION_API_KEY;

if (!endpoint) {
  console.error("[broadcast-scheduler] BROADCAST_SCHEDULER_URL is required.");
  process.exit(1);
}

if (!apiKey) {
  console.error("[broadcast-scheduler] AUTOMATION_API_KEY is required.");
  process.exit(1);
}

const url = new URL(endpoint);
if (!["https:", "http:"].includes(url.protocol)) {
  console.error("[broadcast-scheduler] Scheduler URL must use HTTP or HTTPS.");
  process.exit(1);
}

try {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "user-agent": "hrive-broadcast-scheduler/1.0",
    },
    signal: AbortSignal.timeout(240_000),
  });

  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text.slice(0, 1000) };
  }

  if (!response.ok) {
    console.error(
      "[broadcast-scheduler] Dispatch failed.",
      JSON.stringify({ status: response.status, payload }),
    );
    process.exit(1);
  }

  console.log(
    "[broadcast-scheduler] Dispatch completed.",
    JSON.stringify({
      claimed: Number(payload.claimed || 0),
      sent: Number(payload.sent || 0),
      failed: Number(payload.failed || 0),
    }),
  );
} catch (error) {
  console.error(
    "[broadcast-scheduler] Request failed.",
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
}
