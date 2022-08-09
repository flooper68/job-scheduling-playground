import {
  CancelProps,
  DownloadProps,
  ProcessingStatus,
  WsMessage,
} from "@processing/shared";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { EventEmitter } from "node:events";

const stories = [
  {
    uuid: "story-1",
    status: ProcessingStatus.NotDownloaded,
    statusChangeTimestamp: Date.now(),
    title: "Story 1",
    assets: [{ uuid: "asset-1" }, { uuid: "asset-2" }, { uuid: "asset-3" }],
  },
  {
    uuid: "story-2",
    status: ProcessingStatus.NotDownloaded,
    statusChangeTimestamp: Date.now(),
    title: "Story 2",
    assets: [{ uuid: "asset-3" }, { uuid: "asset-4" }],
  },
  {
    uuid: "story-3",
    status: ProcessingStatus.NotDownloaded,
    statusChangeTimestamp: Date.now(),
    title: "Story 3",
    assets: [{ uuid: "asset-4" }, { uuid: "asset-5" }, { uuid: "asset-6" }],
  },
];

interface ProcessedAsset {
  uuid: string;
  finished: boolean;
  started: boolean;
  lastCheck: number;
  createdAt: number;
}

let processedAssets: ProcessedAsset[] = [];

function isAssetStalled(asset: ProcessedAsset) {
  const result =
    (asset.started && !asset.finished && Date.now() - asset.lastCheck > 5000) ||
    (!asset.started && Date.now() - asset.createdAt > 10000);

  if (result) {
    console.log(`Found stalled asset ${asset.uuid}`);
  }

  return result;
}

const emitter = new EventEmitter();
const assetCancelPubSub = new EventEmitter();

function throwRandomly() {
  if (Math.random() > 0.995) {
    throw new Error("RANDOM");
  }
}

function updateStoryStatus(uuid: string, status: ProcessingStatus) {
  const story = stories.find((item) => item.uuid === uuid);

  if (!story) {
    throw new Error(`Story not found`);
  }

  throwRandomly();

  (story.statusChangeTimestamp = Date.now()), (story.status = status);
  emitter.emit("storyChanged");
}

const redisCli = new IORedis({ maxRetriesPerRequest: null });

enum JobTypes {
  Schedule = "Schedule",
  Cancel = "Cancel",
  ScheduleCleaning = "ScheduleCleaning",
}

async function scheduleDownload(data: { uuid: string }) {
  const story = stories.find((item) => item.uuid === data.uuid);

  if (!story) {
    console.log(`Story not found, skipping download schedule`);
    return;
  }

  throwRandomly();

  updateStoryStatus(data.uuid, ProcessingStatus.Scheduled);
}

async function scheduleCleaning(data: { uuid: string }) {
  const story = stories.find((item) => item.uuid === data.uuid);

  if (!story) {
    console.log(`Story not found, skipping clean schedule`);
    return;
  }

  throwRandomly();

  updateStoryStatus(data.uuid, ProcessingStatus.ScheduledCleaning);
}

async function downloadStory(data: { uuid: string }) {
  console.log(`Starting story download of story ${data.uuid}`);

  const story = stories.find((item) => item.uuid === data.uuid);

  if (!story) {
    console.log(`Story not found, skipping download`);
    return;
  }

  throwRandomly();

  if (story.status !== ProcessingStatus.Scheduled) {
    console.log(`Skipping story download, story is not longer scheduled`);
    return;
  }

  updateStoryStatus(data.uuid, ProcessingStatus.Downloading);

  const assetsToProcess = story.assets.filter(
    (item) =>
      !processedAssets.find(
        (asset) => asset.uuid === item.uuid && asset.finished
      )
  );

  await Promise.all(
    assetsToProcess.map(async (asset) => {
      console.log(`Adding job for asset processing of ${asset.uuid}`);
      processedAssets.push({
        uuid: asset.uuid,
        finished: false,
        started: false,
        createdAt: Date.now(),
        lastCheck: Date.now(),
      });
      await assetQueue.add("asset", { uuid: asset.uuid });
    })
  );

  while (true) {
    throwRandomly();

    const story = stories.find((item) => item.uuid === data.uuid);

    if (!story) {
      console.log(`Story not found, cancelling download`);
      assetCancelPubSub.emit("cancel");
      return;
    }

    if (story.status === ProcessingStatus.Canceling) {
      updateStoryStatus(data.uuid, ProcessingStatus.NotDownloaded);
      console.log(`Found story in cancelling state, stopping download`);
      assetCancelPubSub.emit("cancel");

      for (const asset of story.assets) {
        const storiesWithThisAsset = stories.filter(
          (item) =>
            item.status !== ProcessingStatus.NotDownloaded &&
            item.assets.find((storyAsset) => storyAsset.uuid == asset.uuid)
        );

        if (storiesWithThisAsset.length === 1) {
          processedAssets = processedAssets.filter(
            (item) => item.uuid !== asset.uuid
          );
        }
      }
      return;
    }

    let assetsToBeProcessed = processedAssets.filter((item) =>
      assetsToProcess.find((asset) => asset.uuid === item.uuid)
    );

    let isSomeAssetStalled = assetsToBeProcessed.some(isAssetStalled);

    if (isSomeAssetStalled) {
      console.log(`Asset stalled, downloading failed`);
      updateStoryStatus(data.uuid, ProcessingStatus.Error);

      for (const asset of story.assets) {
        const storiesWithThisAsset = stories.filter(
          (item) =>
            item.status !== ProcessingStatus.NotDownloaded &&
            item.assets.find((storyAsset) => storyAsset.uuid == asset.uuid)
        );

        if (storiesWithThisAsset.length === 1) {
          processedAssets = processedAssets.filter(
            (item) => item.uuid !== asset.uuid
          );
        }
      }
      return;
    }

    const areAllProcessed = assetsToBeProcessed.every(
      (asset) => asset.finished
    );

    if (areAllProcessed) {
      console.log(`Downloading finished`);
      updateStoryStatus(data.uuid, ProcessingStatus.Downloaded);
      return;
    }

    await new Promise((res) => setTimeout(res, 500));
  }
}

async function cleanStory(data: { uuid: string }) {
  const story = stories.find((item) => item.uuid === data.uuid);

  if (!story) {
    console.log(`Story not found, skipping cleaning`);
    return;
  }

  throwRandomly();

  updateStoryStatus(data.uuid, ProcessingStatus.Cleaning);

  await new Promise((res) => setTimeout(res, 500));

  for (const asset of story.assets) {
    const storiesWithThisAsset = stories.filter(
      (item) =>
        item.status !== ProcessingStatus.NotDownloaded &&
        item.assets.find((storyAsset) => storyAsset.uuid == asset.uuid)
    );

    if (storiesWithThisAsset.length === 1) {
      processedAssets = processedAssets.filter(
        (item) => item.uuid !== asset.uuid
      );
    }
  }

  updateStoryStatus(data.uuid, ProcessingStatus.NotDownloaded);
}

async function cancelDownload(data: { uuid: string }) {
  const story = stories.find((item) => item.uuid === data.uuid);

  if (!story) {
    console.log(`Story not found, skipping cancelling`);
    return;
  }

  throwRandomly();

  if (story.status === ProcessingStatus.Downloading) {
    updateStoryStatus(data.uuid, ProcessingStatus.Canceling);
  } else {
    updateStoryStatus(data.uuid, ProcessingStatus.NotDownloaded);
  }
}

const schedullingWorker = new Worker(
  "schedulling",
  async (job) => {
    if (job.data.type === JobTypes.Cancel) {
      await cancelDownload(job.data);
    }

    if (job.data.type === JobTypes.Schedule) {
      await scheduleDownload(job.data);
    }

    if (job.data.type === JobTypes.ScheduleCleaning) {
      await scheduleCleaning(job.data);
    }
  },
  {
    concurrency: 1,
    connection: redisCli,
  }
);

const assetQueue = new Queue("assetQueue", {
  connection: redisCli,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: true,
  },
});

const assetWorker = new Worker(
  "assetQueue",
  async (job) => {
    throwRandomly();

    let asset = processedAssets.find((item) => item.uuid === job.data.uuid);

    if (!asset) {
      console.log(`Skipping asset processing, asset not found`);
      return;
    }

    asset.started = true;

    console.log(`Started to process asset ${job.data.uuid}`);

    let cancelled = false;

    function handleCancel() {
      cancelled = true;
    }

    assetCancelPubSub.addListener("cancel", handleCancel);

    for (let i = 0; i < 5; i++) {
      throwRandomly();

      asset = processedAssets.find((item) => item.uuid === job.data.uuid);

      if (!asset) {
        console.log(`Skipping asset processing, asset not found`);
        assetCancelPubSub.removeListener("cancel", handleCancel);
        return;
      }

      if (cancelled) {
        console.log(`Asset processing cancelled`);
        assetCancelPubSub.removeListener("cancel", handleCancel);
        return;
      }

      asset.lastCheck = Date.now();

      await new Promise((res) => setTimeout(res, 500));
    }

    asset = processedAssets.find((item) => item.uuid === job.data.uuid);

    if (!asset) {
      console.log(`Skipping asset processing, asset not found`);
      assetCancelPubSub.removeListener("cancel", handleCancel);
      return;
    }

    console.log(`Asset processing finished ${asset.uuid}`);
    asset.finished = true;
    assetCancelPubSub.removeListener("cancel", handleCancel);
  },
  {
    concurrency: 10,
    connection: redisCli,
  }
);

const shchedullingQueue = new Queue("schedulling", {
  connection: redisCli,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: true,
  },
});

async function processStories() {
  try {
    const stalledStories = stories.filter((item) =>
      [
        ProcessingStatus.Downloading,
        ProcessingStatus.Cleaning,
        ProcessingStatus.Canceling,
      ].includes(item.status)
    );

    stalledStories.forEach((story) =>
      updateStoryStatus(story.uuid, ProcessingStatus.Error)
    );

    for (const asset of processedAssets) {
      const storiesWithThisAsset = stories.filter(
        (item) =>
          item.status !== ProcessingStatus.NotDownloaded &&
          item.assets.find((storyAsset) => storyAsset.uuid == asset.uuid)
      );

      if (storiesWithThisAsset.length === 0) {
        processedAssets = processedAssets.filter(
          (item) => item.uuid !== asset.uuid
        );
      }
    }

    console.log(`Total number of processedAssets is ${processedAssets.length}`);

    const sortedStoriesForProcessing = stories
      .filter((item) =>
        [
          ProcessingStatus.Scheduled,
          ProcessingStatus.ScheduledCleaning,
        ].includes(item.status)
      )
      .sort((a, b) => b.statusChangeTimestamp - a.statusChangeTimestamp);

    const nextProcessing = sortedStoriesForProcessing[0];

    if (!nextProcessing) {
      setTimeout(() => {
        processStories();
      }, 1000);
      return;
    }

    if (nextProcessing.status === ProcessingStatus.Scheduled) {
      await downloadStory({ uuid: nextProcessing.uuid });
    }

    if (nextProcessing.status === ProcessingStatus.ScheduledCleaning) {
      await cleanStory({ uuid: nextProcessing.uuid });
    }

    setTimeout(() => {
      processStories();
    }, 500);
  } catch (e) {
    console.log(e);
    setTimeout(() => {
      processStories();
    }, 500);
  }
}

export class WsServer {
  private readonly _httpServer = createServer();
  private readonly _server = new Server(this._httpServer);

  constructor() {
    processStories();

    this._server.on("connection", (socket: Socket) => {
      console.log(`Client has connected`);

      socket.on(WsMessage.GetStories, () => {
        console.log(`Received request to get stories`);

        socket.emit(WsMessage.GetStoriesResponse, stories);
      });

      socket.on(WsMessage.Download, (props: DownloadProps) => {
        console.log(`Received command to download story ${props.uuid}`);

        shchedullingQueue.add("presentations", {
          uuid: props.uuid,
          type: JobTypes.Schedule,
        });
      });

      socket.on(WsMessage.Cancel, (props: CancelProps) => {
        console.log(
          `Received command to cancel downloading of a story ${props.uuid}`
        );
        shchedullingQueue.add("presentations", {
          uuid: props.uuid,
          type: JobTypes.Cancel,
        });
      });

      socket.on(WsMessage.Clean, (props: DownloadProps) => {
        console.log(`Received command to clean story ${props.uuid}`);

        shchedullingQueue.add("presentations", {
          uuid: props.uuid,
          type: JobTypes.ScheduleCleaning,
        });
      });

      function emitStoryChanged() {
        socket.emit(WsMessage.GetStoriesResponse, stories);
      }

      const subscription = emitter.addListener(
        "storyChanged",
        emitStoryChanged
      );

      socket.on("disconnect", () => {
        subscription.removeListener("storyChanged", emitStoryChanged);
      });
    });
  }

  listen() {
    this._httpServer.listen(3000);
    console.log(`WsServer is listening on port ${3000}`);
  }
}
