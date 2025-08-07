import express from "express";
import http from "http";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import { Server } from "socket.io";

import fileRoutes from "./routes/files.js";
import chatRoutes from "./routes/chat.js";
import pdfRoutes from "./routes/pdf.js";

dotenv.config({ path: ".env.local" });

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

app.use("/api/files", fileRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/pdf", pdfRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: ["http://localhost:5173" , "*"] },
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("send_message", async (msg) => {
    // Broadcast to everyone
    io.emit("receive_message", msg);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
