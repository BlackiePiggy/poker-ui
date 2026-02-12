import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import type { ClientAction, ClientHello, ServerEvent, ServerWelcome, Seat } from "@poker/shared/dist/types.js";
import { assignSeat, handleAction, makeView, setConnected, state } from "./game.js";

const app = express();
app.use(cors({ origin: true, credentials: true }));

app.get("/health", (_req, res) => res.json({ ok: true }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: true, credentials: true }
});

// ✅ 新增：给每个 socket 发“自己的视角”
function emitViews() {
  for (const s of io.sockets.sockets.values()) {
    const seat = (s.data.seat as Seat | null) ?? null;
    const evt: ServerEvent = { type: "VIEW", view: makeView(seat) };
    s.emit("server:event", evt);
  }
}

io.on("connection", (socket) => {
  socket.data.seat = null;

  socket.on("client:hello", (msg: ClientHello) => {
    const token = msg.token ?? uuidv4();
    const seat = assignSeat(token);

    socket.data.token = token;
    socket.data.seat = seat;

    if (seat) setConnected(seat, true);

    const welcome: ServerWelcome = { type: "WELCOME", token, seat };
    socket.emit("server:welcome", welcome);

    // ✅ 关键：不要广播公共视图覆盖别人
    emitViews();
  });

  socket.on("client:action", (action: ClientAction) => {
    const seat = (socket.data.seat as Seat | null) ?? null;

    const err = handleAction(seat, action as any);
    if (err) socket.emit("server:event", err);

    // ✅ 状态变更后，给每个人发各自视角
    emitViews();
  });

  socket.on("disconnect", () => {
    const seat = (socket.data.seat as Seat | null) ?? null;
    if (seat) setConnected(seat, false);

    emitViews();
  });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
httpServer.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`Stage=${state.stage}`);
});