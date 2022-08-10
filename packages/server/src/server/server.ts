import { Repository } from "../repository/repository";
import { JobScheduling } from "../story-processing/job-scheduling";
import {
  CancelProps,
  DownloadProps,
  WsMessage,
} from "@processing/client-contract";
import { Socket } from "socket.io";
import { EventEmitter } from "node:events";
import fastify from "fastify";
import fastifyIO from "fastify-socket.io";
import { AssetReporting } from "../story-processing/asset-reporting";

export class Server {
  private readonly _fastify = fastify({});

  constructor(
    private readonly _jobScheduling: JobScheduling,
    private readonly _storyChangedEmitter: EventEmitter,
    private readonly _repository: Repository,
    private readonly _assetReporting: AssetReporting
  ) {
    this._fastify.register(fastifyIO);

    this._fastify.route({
      method: "POST",
      url: "/api/assets/:uuid/processing-started",
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              acknowledged: { type: "boolean" },
            },
          },
          500: {
            type: "object",
            properties: {
              acknowledged: { type: "boolean" },
            },
          },
        },
        params: {
          type: "object",
          properties: {
            uuid: { type: "string" },
          },
        },
      },
      handler: async (request, reply) => {
        try {
          console.log(`Received processing report started`);
          this._assetReporting.processingStarted({
            uuid: (request.params as any).uuid,
          });
          reply.status(200).send({ acknowledged: true });
        } catch (e) {
          console.log(`Error starting processing of asset`, e);
          reply.status(500).send({ acknowledged: false });
        }
      },
    });

    this._fastify.route({
      method: "POST",
      url: "/api/assets/:uuid/report-health",
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              acknowledged: { type: "boolean" },
            },
          },
          500: {
            type: "object",
            properties: {
              acknowledged: { type: "boolean" },
            },
          },
        },
        params: {
          type: "object",
          properties: {
            uuid: { type: "string" },
          },
        },
      },
      handler: async (request, reply) => {
        try {
          console.log(`Received processing report health`);
          this._assetReporting.reportHealth({
            uuid: (request.params as any).uuid,
          });
          reply.status(200).send({ acknowledged: true });
        } catch (e) {
          console.log(`Error reporting health of asset`, e);
          reply.status(500).send({ acknowledged: false });
        }
      },
    });

    this._fastify.route({
      method: "POST",
      url: "/api/assets/:uuid/upload",
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              acknowledged: { type: "boolean" },
            },
          },
          500: {
            type: "object",
            properties: {},
          },
        },
        params: {
          type: "object",
          properties: {
            uuid: { type: "string" },
          },
        },
      },
      handler: async (request, reply) => {
        try {
          console.log(`Received upload`);
          this._assetReporting.uploadAsset({
            uuid: (request.params as any).uuid,
          });
          reply.status(200).send({});
        } catch (e) {
          console.log(`Error upload`, e);
          reply.status(500).send({});
        }
      },
    });

    this._fastify.ready(() => {
      this._fastify.io.on("connection", (socket: Socket) => {
        console.log(`Client has connected`);

        socket.on(WsMessage.GetStories, () => {
          console.log(`Received request to get stories`);

          socket.emit(
            WsMessage.GetStoriesResponse,
            this._repository.getAllStoriesData()
          );
        });

        socket.on(WsMessage.Download, (props: DownloadProps) => {
          console.log(`Received command to download story ${props.uuid}`);

          this._jobScheduling.scheduleDownload(props);
        });

        socket.on(WsMessage.Cancel, (props: CancelProps) => {
          console.log(
            `Received command to cancel downloading of a story ${props.uuid}`
          );
          this._jobScheduling.cancelDownload(props);
        });

        socket.on(WsMessage.Clean, (props: DownloadProps) => {
          console.log(`Received command to clean story ${props.uuid}`);

          this._jobScheduling.scheduleCleaning(props);
        });

        const emitStoryChanged = () => {
          socket.emit(
            WsMessage.GetStoriesResponse,
            this._repository.getAllStoriesData()
          );
        };

        this._storyChangedEmitter.addListener("storyChanged", emitStoryChanged);

        socket.on("disconnect", () => {
          this._storyChangedEmitter.removeListener(
            "storyChanged",
            emitStoryChanged
          );
        });
      });
    });
  }

  listen() {
    this._fastify.listen({ port: 3000 });
    console.log(`WsServer is listening on port ${3000}`);
  }
}
