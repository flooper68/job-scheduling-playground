import {
  AssetCancelChannel,
  AssetProcessingJobData,
  AssetProcessingQueue,
} from "@processing/asset-processing-contract";
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { EventEmitter } from "node:events";
import { AssetClient } from "./asset-client";
import { AssetProcessing } from "./asset-processing";
import { CancelEvent } from "./cancel-event";

function bootstrap() {
  const redisCli = new IORedis({ maxRetriesPerRequest: null });

  const assetCancelPubSub = new EventEmitter();
  const subCli = new IORedis({ maxRetriesPerRequest: null });
  subCli.subscribe(AssetCancelChannel, (err) => {
    if (err) {
      console.error(`Failed to subscribe to cancel channel.`);
    } else {
      console.log(`Subscribed to cancel channel.`);
    }
  });

  subCli.on("message", () => assetCancelPubSub.emit(CancelEvent));

  const assetClient = new AssetClient();
  const assetProcessing = new AssetProcessing(assetCancelPubSub, assetClient);

  new Worker<AssetProcessingJobData>(
    AssetProcessingQueue,
    async (job) => {
      try {
        const asset = job.data;

        console.log(`Processing asset ${asset.uuid}`);
        await assetProcessing.processAsset(asset);
      } catch (e) {
        console.log(`Asset processing failed`);
      }
    },
    {
      concurrency: 10,
      connection: redisCli,
    }
  );
}

bootstrap();
