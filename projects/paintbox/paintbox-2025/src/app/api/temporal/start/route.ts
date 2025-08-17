import { NextRequest } from "next/server";
import { createTemporalClient } from "@/lib/temporalClient";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const client = await createTemporalClient();

    const handle = await client.workflow.start("EstimationWorkflow", {
      taskQueue: process.env.TEMPORAL_TASK_QUEUE || "paintbox-estimates",
      args: [body ?? {}],
      workflowId: `estimate-${Date.now()}`,
    });

    return new Response(JSON.stringify({ workflowId: handle.workflowId }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "start failed" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
