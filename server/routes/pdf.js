import express from "express";
import upload from "../middlewares/upload.js";
import cloudinary from "../utils/cloudinary.js";
import File from "../models/File.js";

const router = express.Router();

router.post("/upload", upload.single("pdf"), async (req, res) => {
  try {
    // Upload to Cloudinary first
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        public_id: `pdfs/${Date.now()}`,
      },
      async (error, result) => {
        if (error) {
          console.error("Cloudinary error:", error);
          return res.status(500).json({ error: "Cloudinary upload failed", details: error.message });
        }

        // Save only metadata to MongoDB
        const file = new File({
          name: req.file.originalname,
          type: req.file.mimetype,
          size: req.file.size,
          cloudinaryUrl: result.secure_url,
        });

        await file.save();

        res.status(200).json({
          message: "PDF uploaded successfully",
          url: result.secure_url,
          file: {
            name: file.name,
            type: file.type,
            size: file.size,
            url: file.cloudinaryUrl,
            uploadedAt: file.uploadedAt,
          }
        });
      }
    );

    uploadStream.end(req.file.buffer);
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// Get all PDF files from MongoDB
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
