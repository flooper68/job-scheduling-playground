import { ProcessingStatus } from "@processing/client-contract";

export interface ProcessedAsset {
  uuid: string;
  finished: boolean;
  started: boolean;
  lastCheck: number;
  createdAt: number;
}

export interface StoryAsset {
  uuid: string;
}

export interface Story {
  uuid: string;
  status: ProcessingStatus;
  statusChangeTimestamp: number;
  title: string;
  assets: StoryAsset[];
}
