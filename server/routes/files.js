// // import express from "express";
// // import File from "../models/File.js";

// // const router = express.Router();

// // // Upload file
// // router.post("/upload", async (req, res) => {
// //   try {
// //     const { name, type, size, base64 } = req.body;

// //     const file = new File({
// //       name,
// //       type,
// //       size,
// //       contentBase64: base64,
// //     });

// //     await file.save();
// //     res.status(201).json({ message: "File saved successfully", file });
// //   } catch (err) {
// //     res.status(500).json({ error: err.message });
// //   }
// // });

// // router.get("/", async (req, res) => {
// //   try {
// //     const files = await File.find().sort({ uploadedAt: -1 });
// //     res.json(files);
// //   } catch (err) {
// //     res.status(500).json({ error: err.message });
// //   }
// // });

// // export default router;


// import express from "express";
// import File from "../models/File.js";
// import fs from "fs";
// import path from "path";
// import { fileURLToPath } from "url";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const router = express.Router();

// router.post("/upload", async (req, res) => {
//   try {
//     const { name, type, size, base64 } = req.body;

//     // Save to MongoDB
//     const file = new File({
//       name,
//       type,
//       size,
//       contentBase64: base64,
//     });
//     await file.save();

//     // Save to local /upload folder
//     const uploadDir = path.join(__dirname, "../upload");
//     if (!fs.existsSync(uploadDir)) {
//       fs.mkdirSync(uploadDir);
//     }

//     const filePath = path.join(uploadDir, name);
//     const fileData = Buffer.from(base64, "base64");
//     fs.writeFileSync(filePath, fileData);

//     res.status(201).json({ 
//       message: "File saved successfully",
//       filePath: `/upload/${name}`
//     });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// export default router;


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

    // Save to MongoDB
    const file = new File({
      name,
      type,
      size,
      contentBase64: base64,
    });
    await file.save();

    // Ensure /upload directory exists
    const uploadDir = path.join(__dirname, "../upload");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Handle base64 with or without Data URL prefix
    let base64Data = base64;
    if (base64.startsWith("data:")) {
      base64Data = base64.split(",")[1];
    }

    // Save file to local folder
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
