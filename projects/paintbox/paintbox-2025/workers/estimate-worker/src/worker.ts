import { NativeConnection, Worker } from "@temporalio/worker";
import * as activities from "./activities";

async function run() {
  const connection = await NativeConnection.connect();
  const worker = await Worker.create({
    connection,
    workflowsPath: require.resolve("./workflows/estimation.workflow"),
    activities,
    taskQueue: process.env.TEMPORAL_TASK_QUEUE || "paintbox-estimates",
    namespace: process.env.TEMPORAL_NAMESPACE,
  });

  await worker.run();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
