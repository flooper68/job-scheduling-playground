import {
  ProcessingStartedProps,
  ProcessingStartedResponse,
  ReportHealthResponse,
  ReportHealtProps,
  UploadAssetProps,
} from "@processing/asset-processing-contract";
import axios from "axios";

export class AssetClient {
  private _client = axios.create({
    baseURL: "http://localhost:3000/api/assets",
    timeout: 1000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  constructor() {}

  async assetProcessingStarted(
    data: ProcessingStartedProps
  ): Promise<ProcessingStartedResponse> {
    const result = await this._client.post(
      `/${data.uuid}/processing-started`,
      {}
    );

    return result.data;
  }

  async reportHealth(data: ReportHealtProps): Promise<ReportHealthResponse> {
    const result = await this._client.post(`/${data.uuid}/report-health`, {});

    return result.data;
  }

  async uploadAsset(data: UploadAssetProps) {
    const result = await this._client.post(`/${data.uuid}/upload`, {});

    return result.data;
  }
}
