import React, { useEffect } from "react";
import { connectSocket, sendAction, type ServerEvent } from "./socket";
import { useStore } from "./store";
import { Table } from "./poker-ui/Table";

export default function App() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);

  useEffect(() => {
    const s = connectSocket();
    s.on("server:event", (evt: ServerEvent) => {
      if (evt.type === "VIEW") setView(evt.view);
      if (evt.type === "ERROR") alert(evt.message);
    });
    return () => { s.disconnect(); };
  }, [setView]);

  if (!view) return <div style={{ padding: 24 }}>Connecting...</div>;

  return (
    <div>
      <Table view={view} />

      <div style={{
        maxWidth: 900, margin: "0 auto 30px",
        display: "flex", gap: 10, justifyContent: "center"
      }}>
        <button onClick={() => sendAction({ type: "READY" })}
          style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #333" }}>
          READY
        </button>
        <button onClick={() => sendAction({ type: "NEXT" })}
          style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #333" }}>
          NEXT（推进阶段）
        </button>
      </div>
    </div>
  );
}
