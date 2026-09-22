import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAppData } from "./AppContext";
import { realtimeService } from "../main";

const SocketContext = createContext({ socket: null });

export const SocketProvider = ({ children }) => {
  const { isAuth, user } = useAppData();

  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const handleLogout = () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
    };

    window.addEventListener("bitedash:logout", handleLogout);
    return () => window.removeEventListener("bitedash:logout", handleLogout);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!isAuth || !token || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      return;
    }

    // Always clean up existing socket if user/token changed
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
    }

    const newSocket = io(realtimeService, {
      auth: {
        token,
      },
      transports: ["polling", "websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Socket Connected for user:", user._id, newSocket.id);
    });

    newSocket.on("disconnect", () => {
      console.log("Socket Disconnected");
    });

    newSocket.on("connect_error", (err) => {
      console.warn("Socket Error:", err.message);
    });

    return () => {
      newSocket.disconnect();
      if (socketRef.current === newSocket) {
        socketRef.current = null;
        setSocket(null);
      }
    };
  }, [isAuth, user?._id, user?.restaurantId]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
