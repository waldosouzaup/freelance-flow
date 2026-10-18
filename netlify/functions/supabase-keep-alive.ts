import { schedule, Handler } from "@netlify/functions";

const handler: Handler = async () => {
  const supabaseUrl =
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    const errorMsg = "Supabase URL or Publishable/Anon key missing in environment variables.";
    console.error(`[Supabase Keep-Alive] Error: ${errorMsg}`);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: errorMsg }),
    };
  }

  const pingUrl = `${supabaseUrl.replace(/\/$/, "")}/rest/v1/profiles?select=id&limit=1`;
  const startTime = Date.now();

  try {
    const response = await fetch(pingUrl, {
      method: "GET",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });

    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      console.error(
        `[Supabase Keep-Alive] Ping failed with HTTP status ${response.status} in ${durationMs}ms.`
      );
      return {
        statusCode: response.status,
        body: JSON.stringify({
          success: false,
          status: response.status,
          statusText: response.statusText,
          durationMs,
        }),
      };
    }

    console.log(
      `[Supabase Keep-Alive] Ping successful! HTTP ${response.status} in ${durationMs}ms at ${new Date().toISOString()}`
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Supabase database ping executed successfully.",
        timestamp: new Date().toISOString(),
        durationMs,
      }),
    };
  } catch (error: any) {
    console.error("[Supabase Keep-Alive] Unexpected fetch error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message || "Unknown error",
      }),
    };
  }
};

// Schedule to run once a day (@daily = 00:00 UTC)
export { handler };
export const scheduledHandler = schedule("@daily", handler);
