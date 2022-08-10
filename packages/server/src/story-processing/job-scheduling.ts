import { ProcessingStatus } from "@processing/client-contract";
import { failRandomly } from "@processing/common";
import { Repository } from "../repository/repository";

export class JobScheduling {
  constructor(private readonly _repository: Repository) {}

  async cancelDownload(data: { uuid: string }) {
    const story = this._repository.getStory(data.uuid);

    if (!story) {
      console.log(`Story not found, skipping cancel`);
      return;
    }

    failRandomly();

    if (story.status === ProcessingStatus.Downloading) {
      story.update({ status: ProcessingStatus.Canceling });
    } else {
      story.update({ status: ProcessingStatus.NotDownloaded });
    }
  }

  async scheduleDownload(data: { uuid: string }) {
    const story = this._repository.getStory(data.uuid);

    if (!story) {
      console.log(`Story not found, skipping download schedule`);
      return;
    }

    failRandomly();

    story.update({ status: ProcessingStatus.Scheduled });
  }

  async scheduleCleaning(data: { uuid: string }) {
    const story = this._repository.getStory(data.uuid);

    if (!story) {
      console.log(`Story not found, skipping clean schedule`);
      return;
    }

    failRandomly();

    story.update({ status: ProcessingStatus.ScheduledCleaning });
  }
}
