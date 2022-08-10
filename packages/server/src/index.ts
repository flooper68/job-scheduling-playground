import { JobScheduling } from "./story-processing/job-scheduling";
import { EventEmitter } from "node:events";
import { AssetProcessingClient } from "./story-processing/asset-processing-client";
import { ProcessingJob } from "./story-processing/processing-job";
import { StoryProcessing } from "./story-processing/story-processing";
import { Repository } from "./repository/repository";
import { Server } from "./server/server";
import { AssetReporting } from "./story-processing/asset-reporting";

function bootstrap() {
  const assetCancelPubSub = new EventEmitter();
  const storyChangedEmitter = new EventEmitter();

  const assetProcessingClient = new AssetProcessingClient();
  const repository = new Repository(storyChangedEmitter);
  const storyProcessing = new StoryProcessing(
    repository,
    assetProcessingClient,
    assetCancelPubSub
  );
  const assetReporting = new AssetReporting(repository);
  const jobScheduling = new JobScheduling(repository);

  const job = new ProcessingJob(repository, storyProcessing);

  job.start();

  const wsServer = new Server(
    jobScheduling,
    storyChangedEmitter,
    repository,
    assetReporting
  );

  wsServer.listen();
}

bootstrap();
