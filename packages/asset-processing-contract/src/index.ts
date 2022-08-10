export const AssetProcessingQueue = "AssetProcessingQueue";

export interface AssetProcessingJobData {
  uuid: string;
}

export const AssetCancelChannel = "AssetCancelChannel";

export const AssetCancelMessage = "AssetCancelMessage";

export interface ProcessingStartedProps {
  uuid: string;
}

export interface ProcessingStartedResponse {
  acknowledged: string;
}

export interface ReportHealtProps {
  uuid: string;
}

export interface ReportHealthResponse {
  acknowledged: string;
}

export interface UploadAssetProps {
  uuid: string;
}
