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
    const betting = view.betting;

    return (
    <>
        <Table view={view} />
        <div style={{ maxWidth: 900, margin: "0 auto 30px", display: "flex", gap: 10, justifyContent: "center", alignItems: "center" }}>
        <button onClick={() => sendAction({ type: "READY" })} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #333" }}>
            READY
        </button>

        {betting?.allowed?.canFold && (
            <button onClick={() => sendAction({ type: "FOLD" })} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #333" }}>
            FOLD
            </button>
        )}

        {betting?.allowed?.canCheck && (
            <button onClick={() => sendAction({ type: "CHECK" })} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #333" }}>
            CHECK
            </button>
        )}

        {betting?.allowed?.canCall && (
            <button onClick={() => sendAction({ type: "CALL" })} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #333" }}>
            CALL ({betting.allowed.toCall})
            </button>
        )}

        {(betting?.allowed?.canBet || betting?.allowed?.canRaise) && (
            <>
            <input
                id="amt"
                defaultValue={betting.allowed.canBet ? betting.allowed.minBet : betting.allowed.minRaiseTo}
                style={{ width: 110, padding: "10px 10px", borderRadius: 10, border: "1px solid #333" }}
            />
            {betting.allowed.canBet && (
                <button
                onClick={() => {
                    const v = Number((document.getElementById("amt") as HTMLInputElement).value);
                    sendAction({ type: "BET", amount: v });
                }}
                style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #333" }}
                >
                BET
                </button>
            )}
            {betting.allowed.canRaise && (
                <button
                onClick={() => {
                    const v = Number((document.getElementById("amt") as HTMLInputElement).value);
                    sendAction({ type: "RAISE", amount: v });
                }}
                style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #333" }}
                >
                RAISE TO
                </button>
            )}
            </>
        )}
        </div>
    </>
    );
}
