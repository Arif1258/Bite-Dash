import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAppData } from "./AppContext";
import { realtimeService } from "../main";

const SocketContext = createContext({ socket: null });

export const SocketProvider = ({ children }) => {
  const { isAuth } = useAppData();

  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!isAuth) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocket(null);
      return;
    }

    if (socketRef.current) return;

    const socket = io(realtimeService, {
      auth: {
        token: localStorage.getItem("token"),
      },
      // "polling" first so the connection works on Vercel serverless.
      // Socket.io will auto-upgrade to "websocket" if the server supports it.
      transports: ["polling", "websocket"],
    });

    socketRef.current = socket;
    setSocket(socket);

    socket.on("connect", () => {
      console.log("Socket Connected", socket.id);
    });

    socket.on("disconnect", () => {
      console.log("Socket Disconnected");
    });

    socket.on("connect_error", (err) => {
      console.log("Socket Error:", err.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [isAuth]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
