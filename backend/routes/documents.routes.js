import express from "express";
import multer from "multer";
//import * as pdfParse from "pdf-parse";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import mammoth from "mammoth";
import fs from "fs";
import path from "path";
import { db } from "../db.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const router = express.Router();

/* =========================
   MULTER CONFIGURATION
========================= */

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/original/");
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = ["txt", "pdf", "docx"];
  const ext = path.extname(file.originalname).substring(1).toLowerCase();

  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file type"));
  }
};

const upload = multer({ storage, fileFilter });

/* =========================
   GET ALL DOCUMENTS
========================= */
router.get("/", authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const [rows] = await db.query(
      "SELECT * FROM documents WHERE user_id = ?",
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database error" });
  }
});

/* =========================
   UPLOAD DOCUMENT
========================= */
router.post("/upload", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { originalname, filename } = req.file;
    const fileType = path.extname(originalname).substring(1).toLowerCase();

    let extractedContent = "";

    // Read content (for now only for .txt files)
    const filePath = path.join("uploads", "original", filename);

    if (fileType === "txt") {
      extractedContent = fs.readFileSync(filePath, "utf-8");

    } else if (fileType === "pdf") {
      const dataBuffer = fs.readFileSync(filePath);
      const uint8Array = new Uint8Array(dataBuffer);

      const loadingTask = pdfjsLib.getDocument({
        data: uint8Array,
        useSystemFonts: true,
      });

      const pdf = await loadingTask.promise;

      let text = "";

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        const pageText = content.items.map(item => item.str).join(" ");
        text += pageText + "\n";
      }

      extractedContent = text;

    } else if (fileType === "docx") {
      const result = await mammoth.extractRawText({ path: filePath });
      extractedContent = result.value;

    } else {
      return res.status(400).json({
        message: "Unsupported file type"
      });
    }

    // check if there is extracted text
    if (!extractedContent || extractedContent.trim().length === 0) {
      return res.status(400).json({
        message: "No readable text could be extracted from the document"
      });
    }

    // Insert into the DB
    const [result] = await db.query(
      `INSERT INTO documents (title, content, file_type, user_id)
       VALUES (?, ?, ?, ?)`,
      [originalname, extractedContent, fileType, userId]
    );

    res.status(201).json({
      id: result.insertId,
      title: originalname,
      fileType
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error uploading document" });
  }
});

/* =========================
   GET DOCUMENT CONTENT 
========================= */
router.get("/:id/content", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const docId = req.params.id;

  const [rows] = await db.query(
    "SELECT content FROM documents WHERE id = ? AND user_id = ?",
    [docId, userId]
  );

  if (rows.length === 0) {
    return res.status(404).json({ message: "Document not found" });
  }

  res.json({ content: rows[0].content });
});

export default router;