import { ProcessingStatus } from "@processing/client-contract";
import { Repository } from "../repository/repository";
import { StoryProcessing } from "./story-processing";

export class ProcessingJob {
  constructor(
    private readonly _repository: Repository,
    private readonly _storyProcessingHandler: StoryProcessing
  ) {}

  start() {
    this.process();
  }

  private async process() {
    try {
      const stalledStories = this._repository.getStoriesInProgress();

      stalledStories.forEach((story) =>
        story.update({ status: ProcessingStatus.Error })
      );

      const processedAssets = this._repository.getAllProcesseAssets();

      for (const asset of processedAssets) {
        const storiesWithThisAsset =
          this._repository.getProcessedStoriesHavingAsset(asset.uuid);

        if (storiesWithThisAsset.length === 0) {
          this._repository.deleteProcessedAsset(asset.uuid);
        }
      }

      const nextProcessing = this._repository.getNextScheduledStory();

      if (!nextProcessing) {
        setTimeout(() => {
          this.process();
        }, 100);
        return;
      }

      if (nextProcessing.status === ProcessingStatus.Scheduled) {
        await this._storyProcessingHandler.downloadStory({
          uuid: nextProcessing.uuid,
        });
      }

      if (nextProcessing.status === ProcessingStatus.ScheduledCleaning) {
        await this._storyProcessingHandler.cleanStory({
          uuid: nextProcessing.uuid,
        });
      }

      setTimeout(() => {
        this.process();
      }, 500);
    } catch (e) {
      console.log(`There was an error handling processing job`, e);
      setTimeout(() => {
        this.process();
      }, 500);
    }
  }
}
