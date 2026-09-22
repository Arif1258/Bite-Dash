import { Server } from "socket.io";
import jwt from "jsonwebtoken";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error("Unauthorized"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SEC);

      if (!decoded || !decoded.user) {
        return next(new Error("Unauthorized"));
      }

      socket.data.user = decoded.user;

      next();
    } catch (error) {
      console.log("❌ Socket auth failed: ", error);
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user;

    if (!user) {
      socket.disconnect();
      return;
    }

    const userId = user._id;

    socket.join(`user:${userId}`);

    if (user.restaurantId) {
      socket.join(`restaurant:${user.restaurantId}`);
    }

    if (user.role === "rider") {
      socket.join("riders");
    }

    // Dynamic room subscriptions from client
    socket.on("join", (room) => {
      if (typeof room === "string" && room.trim()) {
        socket.join(room.trim());
      }
    });

    socket.on("join:restaurant", (restId) => {
      if (restId) {
        socket.join(`restaurant:${restId}`);
      }
    });

    socket.on("leave", (room) => {
      if (typeof room === "string" && room.trim()) {
        socket.leave(room.trim());
      }
    });

    console.log(`User connected: ${userId}, role: ${user.role}`);
    console.log("Socket rooms: ", [...socket.rooms]);

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${userId}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }

  return io;
};
