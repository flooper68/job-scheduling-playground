import { useEffect, useMemo, useState } from "react";
import {
  CancelProps,
  CleanProps,
  DownloadProps,
  ProcessingStatus,
  WsMessage,
  WsStory,
} from "@processing/shared";
import { io } from "socket.io-client";
import "./App.css";

import.meta.hot?.decline();

function buildSocket() {
  console.log(`Building client`);

  const socket = io();

  socket.on("connect", () => {
    console.log(`Socket connected`);
  });

  const client = {
    getStories() {
      socket.emit(WsMessage.GetStories);
    },
    download(props: DownloadProps) {
      socket.emit(WsMessage.Download, props);
    },
    clean(props: CleanProps) {
      socket.emit(WsMessage.Clean, props);
    },
    cancel(props: CancelProps) {
      socket.emit(WsMessage.Cancel, props);
    },
  };

  return {
    socket,
    client,
  };
}

function App() {
  const [stories, setStories] = useState<WsStory[]>([]);
  const [inProgress, setInProgess] = useState(true);

  const { socket, client } = useMemo(() => buildSocket(), []);

  useEffect(() => {
    client.getStories();
  }, [client]);

  useEffect(() => {
    socket.on(WsMessage.GetStoriesResponse, (payload: WsStory[]) => {
      console.log(`received stories`, payload);
      setStories(payload);
      setInProgess(false);
    });
  }, [socket]);

  return (
    <div className="App">
      {stories.map((story) => (
        <div key={story.uuid}>
          {story.title}
          {story.status}
          {story.status === ProcessingStatus.NotDownloaded && (
            <button onClick={() => client.download({ uuid: story.uuid })}>
              Download
            </button>
          )}

          {story.status === ProcessingStatus.Scheduled && (
            <button onClick={() => client.cancel({ uuid: story.uuid })}>
              Cancel
            </button>
          )}

          {story.status === ProcessingStatus.Downloading && (
            <button onClick={() => client.cancel({ uuid: story.uuid })}>
              Cancel
            </button>
          )}

          {story.status === ProcessingStatus.Canceling && (
            <button disabled>Canceling...</button>
          )}

          {story.status === ProcessingStatus.ScheduledCleaning && (
            <button disabled>Cleaning...</button>
          )}

          {story.status === ProcessingStatus.Cleaning && (
            <button disabled>Cleaning...</button>
          )}

          {story.status === ProcessingStatus.Downloaded && (
            <button onClick={() => client.clean({ uuid: story.uuid })}>
              Clean
            </button>
          )}

          {story.status === ProcessingStatus.Error && (
            <button onClick={() => client.clean({ uuid: story.uuid })}>
              Clean
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export default App;
