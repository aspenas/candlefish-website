import { Connection, Client } from "@temporalio/client";

export async function createTemporalClient() {
  const address = process.env.TEMPORAL_ADDRESS;
  const namespace = process.env.TEMPORAL_NAMESPACE;

  const connection = await Connection.connect({ address });
  return new Client({ connection, namespace });
}
