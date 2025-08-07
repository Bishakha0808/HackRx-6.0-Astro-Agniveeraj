import express from "express";
import File from "../models/File.js";

const router = express.Router();

// Upload file
router.post("/upload", async (req, res) => {
  try {
    const { name, type, size, base64 } = req.body;

    const file = new File({
      name,
      type,
      size,
      contentBase64: base64,
    });

    await file.save();
    res.status(201).json({ message: "File saved successfully", file });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const files = await File.find().sort({ uploadedAt: -1 });
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
