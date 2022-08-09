import { WsServer } from "./ws-server";

function bootstrap() {
  const wsServer = new WsServer();

  wsServer.listen();
}

bootstrap();
