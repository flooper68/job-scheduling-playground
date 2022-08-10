import { AssetProcessingQueue } from "@processing/asset-processing-contract";
import { Queue } from "bullmq";
import IORedis from "ioredis";

export class AssetProcessingClient {
  private readonly _queue: Queue;

  constructor() {
    const redisCli = new IORedis({ maxRetriesPerRequest: null });

    this._queue = new Queue(AssetProcessingQueue, {
      connection: redisCli,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
      },
    });
  }

  async dispatchProcessAsset(uuid: string) {
    await this._queue.add("asset", { uuid: uuid });
  }
}
