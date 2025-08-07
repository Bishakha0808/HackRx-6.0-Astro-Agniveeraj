import express from "express";
import Message from "../models/Message.js";

const router = express.Router();

// Get all messages
router.get("/", async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send a message
router.post("/", async (req, res) => {
  try {
    const { content, sender = "user" } = req.body;

    const message = new Message({ content, sender });
    await message.save();

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
