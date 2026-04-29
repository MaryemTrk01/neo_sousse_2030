import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [lastAlert, setLastAlert] = useState(null);
    const [aiReport, setAiReport] = useState(null);

    useEffect(() => {
        // En développement, on pointe vers localhost:5000
        const newSocket = io('http://localhost:5000');
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('✅ WebSocket Connected');
        });

        newSocket.on('alert', (data) => {
            console.log('🚨 Alert received:', data);
            setLastAlert(data);
            // On pourrait ajouter un toast ici
        });

        newSocket.on('ai_report', (data) => {
            console.log('🤖 AI Report received:', data);
            setAiReport(data);
        });

        return () => newSocket.close();
    }, []);

    return (
        <SocketContext.Provider value={{ socket, lastAlert, aiReport }}>
            {children}
        </SocketContext.Provider>
    );
};
