import { EventEmitter } from "node:events";
import { ProcessingStatus } from "@processing/client-contract";
import { failRandomly } from "@processing/common";
import { ProcessedAsset, Story } from "../contracts/types";
import { StoryEntity, AssetEntity } from "../story-processing/entities";

export class Repository {
  private _stories: Story[] = [
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

  private _processedAssets: ProcessedAsset[] = [];

  constructor(private readonly _storyChangedEmitter: EventEmitter) {}

  getAllStoriesData() {
    return this._stories;
  }

  getStory(uuid: string) {
    const story = this._stories.find((item) => item.uuid === uuid);

    if (!story) {
      return;
    }

    return new StoryEntity(
      story.status,
      story.assets,
      story,
      this._storyChangedEmitter
    );
  }

  getProcessedStoriesHavingAsset(uuid: string) {
    const stories = this._stories
      .filter(
        (item) =>
          item.status !== ProcessingStatus.NotDownloaded &&
          item.assets.find((storyAsset) => storyAsset.uuid === uuid)
      )
      .map(
        (story) =>
          new StoryEntity(
            story.status,
            story.assets,
            story,
            this._storyChangedEmitter
          )
      );

    failRandomly();

    return stories;
  }

  removeProcessedAsset(uuid: string) {
    this._processedAssets = this._processedAssets.filter(
      (item) => item.uuid !== uuid
    );
  }

  getStoriesInProgress() {
    failRandomly();

    return this._stories
      .filter((item) =>
        [
          ProcessingStatus.Downloading,
          ProcessingStatus.Cleaning,
          ProcessingStatus.Canceling,
        ].includes(item.status)
      )
      .map(
        (story) =>
          new StoryEntity(
            story.status,
            story.assets,
            story,
            this._storyChangedEmitter
          )
      );
  }

  getNextScheduledStory() {
    failRandomly();

    const stories = this._stories
      .filter((item) =>
        [
          ProcessingStatus.Scheduled,
          ProcessingStatus.ScheduledCleaning,
        ].includes(item.status)
      )
      .sort((a, b) => b.statusChangeTimestamp - a.statusChangeTimestamp);

    return stories[0];
  }

  getAllProcesseAssets() {
    failRandomly();

    return this._processedAssets;
  }

  getProcessedAsset(uuid: string) {
    const asset = this._processedAssets.find((item) => item.uuid === uuid);

    if (!asset) {
      return;
    }

    return new AssetEntity(
      asset.uuid,
      asset.started,
      asset.finished,
      asset.lastCheck,
      asset.createdAt,
      asset
    );
  }

  getProcessedFinishedAsset(uuid: string) {
    const asset = this._processedAssets.find(
      (item) => item.uuid === uuid && item.finished
    );

    if (!asset) {
      return;
    }

    return new AssetEntity(
      asset.uuid,
      asset.started,
      asset.finished,
      asset.lastCheck,
      asset.createdAt,
      asset
    );
  }

  createAssetToBeProcessed(uuid: string) {
    this._processedAssets = this._processedAssets.filter(
      (item) => item.uuid !== uuid
    );

    this._processedAssets.push({
      uuid: uuid,
      finished: false,
      started: false,
      createdAt: Date.now(),
      lastCheck: Date.now(),
    });
  }

  deleteProcessedAsset(uuid: string) {
    this._processedAssets = this._processedAssets.filter(
      (item) => item.uuid !== uuid
    );
  }
}
