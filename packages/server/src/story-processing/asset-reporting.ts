import {
  ProcessingStartedProps,
  ReportHealtProps,
  UploadAssetProps,
} from "@processing/asset-processing-contract";

import { Repository } from "../repository/repository";

export class AssetReporting {
  constructor(private readonly _repository: Repository) {}

  processingStarted(props: ProcessingStartedProps) {
    const asset = this._repository.getProcessedAsset(props.uuid);

    if (!asset) {
      throw new Error(`Asset not found`);
    }

    asset.update({ started: true, lastCheck: Date.now() });
  }

  reportHealth(props: ReportHealtProps) {
    const asset = this._repository.getProcessedAsset(props.uuid);

    if (!asset) {
      throw new Error(`Asset not found`);
    }

    asset.update({ lastCheck: Date.now() });
  }

  uploadAsset(props: UploadAssetProps) {
    const asset = this._repository.getProcessedAsset(props.uuid);

    if (!asset) {
      throw new Error(`Asset not found`);
    }

    asset.update({ finished: true });
  }
}
