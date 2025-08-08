import express from "express";
import upload from "../middlewares/upload.js";
import cloudinary from "../utils/cloudinary.js";
import File from "../models/File.js";

const router = express.Router();

router.post("/upload", upload.array("pdfs"), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const uploadedFiles = [];

    for (const file of req.files) {
      const uploadStream = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: "raw", public_id: `pdfs/${Date.now()}-${file.originalname}` },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        stream.end(file.buffer);
      });

      const savedFile = new File({
        name: file.originalname,
        type: file.mimetype,
        size: file.size,
        cloudinaryUrl: uploadStream.secure_url,
      });

      await savedFile.save();
      uploadedFiles.push(savedFile);
    }

    res.status(200).json({
      message: "PDFs uploaded successfully",
      files: uploadedFiles.map(f => ({
        name: f.name,
        type: f.type,
        size: f.size,
        url: f.cloudinaryUrl,
        uploadedAt: f.uploadedAt,
      }))
    });

  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});


// // Get all PDF files from MongoDB
router.get("/", async (req, res) => {
  try {
    const files = await File.find({ type: { $regex: /pdf/i } }).sort({ uploadedAt: -1 });
    res.json(files.map(f => ({
      name: f.name,
      type: f.type,
      size: f.size,
      url: f.cloudinaryUrl,
      uploadedAt: f.uploadedAt,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;


