import { NextRequest } from "next/server";
import { createTemporalClient } from "@/lib/temporalClient";

export async function POST(req: NextRequest) {
  try {
    const { workflowId, approval } = await req.json();
    const client = await createTemporalClient();
    const handle = client.workflow.getHandle(workflowId);
    await handle.signal("approvalSignal", approval);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "signal failed" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
