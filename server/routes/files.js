import express from "express";
import File from "../models/File.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

router.post("/upload", async (req, res) => {
  try {
    const { name, type, size, base64 } = req.body;

    if (!name || !type || !size || !base64) {
      return res.status(400).json({ error: "Missing required file fields" });
    }

    const file = new File({
      name,
      type,
      size,
      contentBase64: base64,
    });
    await file.save();

    const uploadDir = path.join(__dirname, "../upload");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    let base64Data = base64;
    if (base64.startsWith("data:")) {
      base64Data = base64.split(",")[1];
    }

    const filePath = path.join(uploadDir, name);
    fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));

    res.status(201).json({
      message: "File saved successfully",
      filePath: `/upload/${name}`,
    });

  } catch (err) {
    console.error("Error saving file:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
