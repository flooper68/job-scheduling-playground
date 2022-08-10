import { EventEmitter } from "node:events";
import { AssetClient } from "./asset-client";
import { failRandomly } from "@processing/common";
import { CancelEvent } from "./cancel-event";

export class AssetProcessing {
  constructor(
    private readonly _cancelPubSub: EventEmitter,
    private readonly _assetProcessingClient: AssetClient
  ) {}

  async processAsset(asset: { uuid: string }) {
    failRandomly();

    console.log(`Reporting asset start`)

    const result = await this._assetProcessingClient.assetProcessingStarted({
      uuid: asset.uuid,
    });

    console.log(`Asset processing started for asset ${asset.uuid}`);

    if (!result.acknowledged) {
      console.log(
        `Skipped processing asset ${asset.uuid}, start of processing was not acknowledged`
      );
      return;
    }

    console.log(`Started to process asset ${asset.uuid}`);

    let cancelled = false;

    function handleCancel() {
      cancelled = true;
    }

    this._cancelPubSub.addListener(CancelEvent, handleCancel);

    for (let i = 0; i < 5; i++) {
      failRandomly();

      if (!asset) {
        console.log(`Skipping asset processing, asset not found`);
        this._cancelPubSub.removeListener(CancelEvent, handleCancel);
        return;
      }

      if (cancelled) {
        console.log(`Asset processing cancelled`);
        this._cancelPubSub.removeListener(CancelEvent, handleCancel);
        return;
      }

      const result = await this._assetProcessingClient.reportHealth({
        uuid: asset.uuid,
      });

      if (!result.acknowledged) {
        console.log(
          `Skipped processing asset ${asset.uuid}, report health was not acknowledged`
        );
        return;
      }

      await new Promise((res) => setTimeout(res, 500));
    }

    if (!asset) {
      console.log(`Skipping asset processing, asset not found`);
      this._cancelPubSub.removeListener(CancelEvent, handleCancel);
      return;
    }

    console.log(`Asset processing finished ${asset.uuid}`);

    await this._assetProcessingClient.uploadAsset({ uuid: asset.uuid });

    this._cancelPubSub.removeListener(CancelEvent, handleCancel);
  }
}
