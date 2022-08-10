export enum WsMessage {
  Download = "Download",
  Cancel = "Cancel",
  Clean = "Clean",
  GetStories = "GetStories",
  GetStoriesResponse = "GetStoriesResponse",
}

export enum ProcessingStatus {
  NotDownloaded = "NotDownloaded",
  Scheduled = "Scheduled",
  Downloading = "Downloading",
  Canceling = "Canceling",
  ScheduledCleaning = "ScheduledCleaning",
  Cleaning = "Cleaning",
  Downloaded = "Downloaded",
  Error = "Error",
}

export interface WsStory {
  uuid: string;
  title: string;
  status: ProcessingStatus;
}

export interface DownloadProps {
  uuid: string;
}

export interface CancelProps {
  uuid: string;
}

export interface CleanProps {
  uuid: string;
}
