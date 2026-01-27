import express from "express";
import { db } from "../db.js";

const router = express.Router();

/**
 * GET /api/annotations/document/:documentId/:userId
 * Fetch all annotations for a specific document
 */
router.get("/document/:documentId/:userId", async (req, res) => {
  try {
    const { documentId, userId } = req.params;

    const conn = await db.getConnection();
    const [rows] = await conn.query(
      `SELECT 
        a.id, 
        a.document_id, 
        a.label_id, 
        a.start_offset, 
        a.end_offset, 
        a.selected_text, 
        a.user_id,
        l.name as label_name,
        l.color as label_color
      FROM annotations a
      LEFT JOIN labels l ON a.label_id = l.id
      WHERE a.document_id = ? AND a.user_id = ?
      ORDER BY a.start_offset ASC`,
      [documentId, userId]
    );
    conn.release();

    // Format response to match frontend expectations
    const annotations = rows.map(row => ({
      id: row.id,
      document_id: row.document_id,
      label_id: row.label_id,
      start: row.start_offset,
      end: row.end_offset,
      text: row.selected_text,
      label: row.label_name,
      color: row.label_color,
      user_id: row.user_id
    }));

    res.json(annotations);
  } catch (err) {
    console.error("Error fetching annotations:", err);
    res.status(500).json({ error: "Failed to fetch annotations" });
  }
});

/**
 * POST /api/annotations
 * Create a new annotation
 */
router.post("/", async (req, res) => {
  try {
    const { document_id, label_id, start_offset, end_offset, selected_text, user_id } = req.body;

    // Validate required fields
    if (!document_id || !label_id || start_offset === undefined || end_offset === undefined || !selected_text || !user_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const conn = await db.getConnection();
    
    // Insert annotation
    const [result] = await conn.query(
      `INSERT INTO annotations (document_id, label_id, start_offset, end_offset, selected_text, user_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [document_id, label_id, start_offset, end_offset, selected_text, user_id]
    );

    // Fetch the created annotation with label info
    const [annotation] = await conn.query(
      `SELECT 
        a.id, 
        a.document_id, 
        a.label_id, 
        a.start_offset, 
        a.end_offset, 
        a.selected_text, 
        a.user_id,
        l.name as label_name,
        l.color as label_color
      FROM annotations a
      LEFT JOIN labels l ON a.label_id = l.id
      WHERE a.id = ?`,
      [result.insertId]
    );
    conn.release();

    const annotation_obj = annotation ? {
      id: annotation.id,
      document_id: annotation.document_id,
      label_id: annotation.label_id,
      start: annotation.start_offset,
      end: annotation.end_offset,
      text: annotation.selected_text,
      label: annotation.label_name,
      color: annotation.label_color,
      user_id: annotation.user_id
    } : null;

    res.json({ id: result.insertId, ...annotation_obj });
  } catch (err) {
    console.error("Error creating annotation:", err);
    res.status(500).json({ error: "Failed to create annotation" });
  }
});

/**
 * DELETE /api/annotations/:id/:userId
 * Delete an annotation (with user verification)
 */
router.delete("/:id/:userId", async (req, res) => {
  try {
    const { id, userId } = req.params;

    const conn = await db.getConnection();
    
    // Verify ownership before deleting
    const [annotation] = await conn.query(
      "SELECT id FROM annotations WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (!annotation) {
      conn.release();
      return res.status(404).json({ error: "Annotation not found or unauthorized" });
    }

    await conn.query("DELETE FROM annotations WHERE id = ?", [id]);
    conn.release();

    res.json({ success: true, id });
  } catch (err) {
    console.error("Error deleting annotation:", err);
    res.status(500).json({ error: "Failed to delete annotation" });
  }
});

export default router;
