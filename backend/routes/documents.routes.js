import express from "express";
import multer from "multer";
import path from "path";
import { documents } from "../data/documents.mock.js";

const router = express.Router();

// Storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["txt", "pdf", "docx"];
  const ext = path.extname(file.originalname).substring(1);
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type"));
  }
};

const upload = multer({ storage, fileFilter });

// Upload endpoint
router.post("/upload", upload.single("file"), (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const newDocument = {
    id: documents.length + 1,
    originalName: file.originalname,
    filename: file.filename,
    type: path.extname(file.originalname).substring(1)
  };

  documents.push(newDocument);

  res.status(201).json(newDocument);
});

export default router;
