import express from "express";
import multer from "multer";
import path from "path";
import cors from "cors";

const app = express();
app.use(cors()); // Allow requests from frontend

// Set up storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "recordings/"); // Store files in 'recordings' directory
  },
  filename: (req, file, cb) => {
    cb(null, `meeting.mp4`);
  },
});

const upload = multer({ storage: storage });

// Route to handle file upload
app.post("/upload", upload.single("video"), (req, res) => {
  res.json({ message: "File uploaded successfully", filename: req.file.filename });
});

// Start server
const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
