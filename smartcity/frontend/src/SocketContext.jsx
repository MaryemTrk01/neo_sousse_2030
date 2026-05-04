import { createContext, useContext, useEffect, useState } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:5000", {
    transports: ["websocket", "polling"],
    reconnection: true,
});

export const SocketContext = createContext({
    socket: null,
    connected: false,
    lastAlert: null,
});

export const SocketProvider = ({ children }) => {
    const [connected, setConnected] = useState(socket.connected);
    const [lastAlert, setLastAlert] = useState(null);

    useEffect(() => {
        const onConnect = () => { console.log("SOCKET CONNECTED"); setConnected(true); };
        const onDisconnect = () => { console.log("SOCKET DISCONNECTED"); setConnected(false); };
        const onAlert = (data) => setLastAlert(data);

        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);
        socket.on("alert", onAlert);

        return () => {
            socket.off("connect", onConnect);
            socket.off("disconnect", onDisconnect);
            socket.off("alert", onAlert);
        };
    }, []);

    return (
        <SocketContext.Provider value={{ socket, connected, lastAlert }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);