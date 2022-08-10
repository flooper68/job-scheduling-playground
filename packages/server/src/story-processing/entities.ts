import { ProcessedAsset } from "./../contracts/types";
import { EventEmitter } from "node:events";
import { ProcessingStatus } from "@processing/client-contract";
import { failRandomly } from "@processing/common";
import { StoryAsset, Story } from "../contracts/types";

export class StoryEntity {
  constructor(
    public readonly status: ProcessingStatus,
    public readonly assets: StoryAsset[],
    private readonly _story: Story,
    private readonly _storyChangedEmitter: EventEmitter
  ) {}

  update(data: { status?: ProcessingStatus }) {
    failRandomly();

    if (data.status) {
      this._story.status = data.status;
    }

    this._storyChangedEmitter.emit("storyChanged");
  }
}

export class AssetEntity {
  constructor(
    public readonly uuid: string,
    public started: boolean,
    public finished: boolean,
    public lastCheck: number,
    public createdAt: number,
    private readonly _asset: ProcessedAsset
  ) {}

  update(data: { started?: boolean; finished?: boolean; lastCheck?: number }) {
    failRandomly();

    if (data.started) {
      this._asset.started = data.started;
    }

    if (data.finished) {
      this._asset.finished = data.finished;
    }

    if (data.lastCheck) {
      this._asset.lastCheck = data.lastCheck;
    }
  }

  isAssetStalled() {
    const result =
      (this.started && !this.finished && Date.now() - this.lastCheck > 5000) ||
      (!this.started && Date.now() - this.createdAt > 10000);

    if (result) {
      console.log(`Found stalled asset ${this.uuid}`);
    }

    return result;
  }
}
