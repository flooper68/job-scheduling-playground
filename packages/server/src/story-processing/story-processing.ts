import { EventEmitter } from "node:events";
import { ProcessingStatus } from "@processing/client-contract";
import { failRandomly } from "@processing/common";
import { Repository } from "../repository/repository";
import { AssetProcessingClient } from "./asset-processing-client";

export class StoryProcessing {
  constructor(
    private readonly _repository: Repository,
    private readonly _assetProcessingClient: AssetProcessingClient,
    private readonly _assetCancelPubSub: EventEmitter
  ) {}

  async cleanStory(data: { uuid: string }) {
    const story = this._repository.getStory(data.uuid);

    if (!story) {
      console.log(`Story not found, skipping cleaning`);
      return;
    }

    failRandomly();

    story.update({ status: ProcessingStatus.Cleaning });

    await new Promise((res) => setTimeout(res, 500));

    for (const asset of story.assets) {
      const storiesWithThisAsset =
        this._repository.getProcessedStoriesHavingAsset(asset.uuid);

      if (storiesWithThisAsset.length === 1) {
        this._repository.removeProcessedAsset(asset.uuid);
      }
    }

    story.update({ status: ProcessingStatus.NotDownloaded });
  }

  async downloadStory(props: { uuid: string }) {
    console.log(`Starting story download of story ${props.uuid}`);

    const story = this._repository.getStory(props.uuid);

    if (!story) {
      console.log(`Story not found, skipping download`);
      return;
    }

    if (story.status !== ProcessingStatus.Scheduled) {
      console.log(`Skipping story download, story is no longer scheduled`);
      return;
    }

    story.update({ status: ProcessingStatus.Downloading });

    const assetsToProcess = story.assets.filter(
      (item) => !this._repository.getProcessedFinishedAsset(item.uuid)
    );

    await Promise.all(
      assetsToProcess.map(async (asset) => {
        console.log(`Adding job for asset processing of ${asset.uuid}`);
        this._repository.createAssetToBeProcessed(asset.uuid);
        await this._assetProcessingClient.dispatchProcessAsset(asset.uuid);
      })
    );

    while (true) {
      const story = this._repository.getStory(props.uuid);

      if (!story) {
        console.log(`Story not found, cancelling download`);
        this._assetCancelPubSub.emit("cancel");
        return;
      }

      if (story.status === ProcessingStatus.Canceling) {
        story.update({ status: ProcessingStatus.NotDownloaded });
        console.log(`Found story in cancelling state, stopping download`);
        this._assetCancelPubSub.emit("cancel");
        return;
      }

      let assetsToBeProcessed = assetsToProcess.map(
        (asset) => this._repository.getProcessedAsset(asset.uuid)!
      );

      let isSomeAssetStalled = assetsToBeProcessed.some((asset) =>
        asset.isAssetStalled()
      );

      if (isSomeAssetStalled) {
        console.log(`Asset stalled, downloading failed`);
        story.update({ status: ProcessingStatus.Error });
        this._assetCancelPubSub.emit("cancel");

        return;
      }

      const areAllProcessed = assetsToBeProcessed.every(
        (asset) => asset.finished
      );

      if (areAllProcessed) {
        console.log(`Downloading finished`);
        story.update({ status: ProcessingStatus.Downloaded });
        return;
      }

      await new Promise((res) => setTimeout(res, 500));
    }
  }
}
