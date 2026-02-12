import { io, type Socket } from "socket.io-client";
import type { ClientHello, ClientAction, ServerEvent, ServerWelcome } from "@poker/shared/dist/types.js";

const SERVER_URL = "http://localhost:3001";

export let socket: Socket;

export function connectSocket() {
  socket = io(SERVER_URL, { transports: ["websocket"] });

  const token = localStorage.getItem("poker_token") ?? undefined;
  const hello: ClientHello = { type: "HELLO", token };

  socket.emit("client:hello", hello);

  socket.on("server:welcome", (msg: ServerWelcome) => {
    localStorage.setItem("poker_token", msg.token);
  });

  return socket;
}

export function sendAction(action: ClientAction) {
  socket.emit("client:action", action);
}

export type { ServerEvent };
