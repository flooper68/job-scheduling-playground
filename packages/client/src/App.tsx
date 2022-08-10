import { useEffect, useMemo, useState } from "react";
import {
  CancelProps,
  CleanProps,
  DownloadProps,
  ProcessingStatus,
  WsMessage,
  WsStory,
} from "@processing/client-contract";
import { io } from "socket.io-client";

import.meta.hot?.decline();
// I need nice table using tailwind css

function buildSocket() {
  console.log(`Building client`);

  const socket = io();

  socket.on("connect", () => {
    console.log(`Socket connected`);

    socket.emit(WsMessage.GetStories);
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

function Status(props: { status: ProcessingStatus }) {
  switch (props.status) {
    case ProcessingStatus.NotDownloaded:
      return (
        <span className="shadow px-3 py-1 text-sm rounded font-semibold">
          Not downloaded
        </span>
      );
    case ProcessingStatus.Downloading:
      return (
        <span className="bg-sky-400 shadow px-3 py-1 text-sm rounded font-semibold text-white">
          Downloading...
        </span>
      );
    case ProcessingStatus.Error:
      return (
        <span className="bg-red-500 shadow px-3 py-1 text-sm text-white rounded font-semibold">
          Error
        </span>
      );
    case ProcessingStatus.Cleaning:
      return (
        <span className="bg-sky-400 shadow px-3 py-1 text-sm rounded font-semibold text-white">
          Cleaning...
        </span>
      );
    case ProcessingStatus.Scheduled:
      return (
        <span className="bg-sky-400 shadow px-3 py-1 text-sm rounded font-semibold text-white">
          Scheduled
        </span>
      );
    case ProcessingStatus.ScheduledCleaning:
      return (
        <span className="bg-sky-400 shadow px-3 py-1 text-sm rounded font-semibold text-white">
          Scheduled Cleaning
        </span>
      );
    case ProcessingStatus.Canceling:
      return (
        <span className="bg-sky-400 shadow px-3 py-1 text-sm rounded font-semibold text-white">
          Canceling...
        </span>
      );
    case ProcessingStatus.Downloaded:
      return (
        <span className="bg-green-500 shadow px-3 py-1 text-sm rounded font-semibold text-white">
          Ready
        </span>
      );
  }

  return <></>;
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
    <div className="w-full h-full">
      <nav className="flex w-full p-5 px-8 bg-slate-800 shadow-md">
        <h2 className="text-xl font-semibold leading-tight text-white font-sans">
          Processing hierarchy PoC
        </h2>
      </nav>

      <div className="container sm py-4 px-10 mx-auto">
        <div className="rounded shadow-md divide-y divide-slate-200">
          <div className="grid grid-cols-3 gap-8 justify-items-center items-center py-3 bg-sky-100">
            <span className="font-semibold">Title</span>
            <span className="font-semibold">Status</span>
            <span className="font-semibold">Actions</span>
          </div>
          {stories.map((story) => (
            <div
              key={story.uuid}
              className="grid grid-cols-3 gap-8 justify-items-center items-center py-3 "
            >
              <span className="text-sm">{story.title}</span>
              <Status status={story.status} />

              {story.status === ProcessingStatus.NotDownloaded && (
                <button
                  onClick={() => client.download({ uuid: story.uuid })}
                  className="bg-sky-500 hover:bg-sky-600 text-white font-medium py-1 px-3 rounded text-sm"
                >
                  Download
                </button>
              )}

              {story.status === ProcessingStatus.Scheduled && (
                <button
                  onClick={() => client.cancel({ uuid: story.uuid })}
                  className="bg-red-500 hover:bg-red-600 text-white font-medium py-1 px-3 rounded text-sm"
                >
                  Cancel
                </button>
              )}

              {story.status === ProcessingStatus.Downloading && (
                <button
                  onClick={() => client.cancel({ uuid: story.uuid })}
                  className="bg-red-500 hover:bg-red-600 text-white font-medium py-1 px-3 rounded text-sm"
                >
                  Cancel
                </button>
              )}

              {story.status === ProcessingStatus.Canceling && (
                <button
                  disabled
                  className="bg-red-500 hover:bg-red-600 text-white font-medium py-1 px-3 rounded text-sm"
                >
                  Canceling...
                </button>
              )}

              {story.status === ProcessingStatus.ScheduledCleaning && (
                <button
                  disabled
                  className="font-medium py-1 px-3 rounded text-sm shadow"
                >
                  Cleaning...
                </button>
              )}

              {story.status === ProcessingStatus.Cleaning && (
                <button
                  disabled
                  className="font-medium py-1 px-3 rounded text-sm shadow"
                >
                  Cleaning...
                </button>
              )}

              {story.status === ProcessingStatus.Downloaded && (
                <button
                  onClick={() => client.clean({ uuid: story.uuid })}
                  className=" font-medium py-1 px-3 rounded text-sm shadow"
                >
                  Clean
                </button>
              )}

              {story.status === ProcessingStatus.Error && (
                <button
                  onClick={() => client.clean({ uuid: story.uuid })}
                  className="font-medium py-1 px-3 rounded text-sm shadow"
                >
                  Clean
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
