import express from "express";
import { db } from "../db.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

const SEGMENT_SIZE = 500;

/* =========================
   HELPER: Calculate which segments an annotation overlaps
   ========================= */
function getSegmentsForAnnotation(startOffset, endOffset) {
  const segments = new Set();
  const startSegment = Math.floor(startOffset / SEGMENT_SIZE);
  const endSegment = Math.floor((endOffset - 1) / SEGMENT_SIZE);
  
  for (let i = startSegment; i <= endSegment; i++) {
    segments.add(i);
  }
  
  return Array.from(segments);
}

/* =========================
   GET LABELS SUMMARY
   Returns: total annotations per label, average annotation length
   ========================= */
router.get("/labels-summary", authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    // Get all labels for the user
    const [labelsResult] = await db.query(
      `SELECT id, name, color FROM labels WHERE user_id = ?`,
      [userId]
    );

    // For each label, count annotations in user's documents
    const labelStats = [];

    for (const label of labelsResult) {
      const [annotationsResult] = await db.query(
        `SELECT a.id, a.start_offset, a.end_offset, a.selected_text
         FROM annotations a
         JOIN documents d ON a.document_id = d.id
         WHERE a.label_id = ? AND d.user_id = ?`,
        [label.id, userId]
      );

      const annotationCount = annotationsResult.length;
      let totalLength = 0;

      annotationsResult.forEach(ann => {
        if (ann.selected_text) {
          totalLength += ann.selected_text.length;
        } else if (ann.start_offset !== null && ann.end_offset !== null) {
          totalLength += ann.end_offset - ann.start_offset;
        }
      });

      const avgLength = annotationCount > 0 ? totalLength / annotationCount : 0;

      labelStats.push({
        id: label.id,
        name: label.name,
        color: label.color,
        count: annotationCount,
        averageLength: Math.round(avgLength * 100) / 100,
        totalLength
      });
    }

    // Get total annotations count
    const [totalResult] = await db.query(
      `SELECT COUNT(*) as total FROM annotations a
       JOIN documents d ON a.document_id = d.id
       WHERE d.user_id = ?`,
      [userId]
    );

    const totalAnnotations = totalResult[0].total;

    res.json({
      totalAnnotations,
      totalLabels: labelsResult.length,
      labels: labelStats.sort((a, b) => b.count - a.count)
    });
  } catch (err) {
    console.error("Error fetching labels summary:", err);
    res.status(500).json({ message: "Error fetching analytics", error: err.message });
  }
});

/* =========================
   GET TOP SEGMENTS BY LABEL
   Query params: labelId (required), topN (optional, default 10)
   Returns segments with highest annotation concentration of the selected label
   ========================= */
router.get("/segments", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { labelId, topN = 10 } = req.query;

  if (!labelId) {
    return res.status(400).json({ message: "labelId is required" });
  }

  try {
    // Verify that the label belongs to the user
    const [labelCheck] = await db.query(
      `SELECT id FROM labels WHERE id = ? AND user_id = ?`,
      [labelId, userId]
    );

    if (labelCheck.length === 0) {
      return res.status(403).json({ message: "Label not found or not owned by user" });
    }

    // Get all documents for the user
    const [documentsResult] = await db.query(
      `SELECT id, content FROM documents WHERE user_id = ?`,
      [userId]
    );

    const segmentStats = {}; // { segmentIndex: { count, annotationIds, documentId, startChar, endChar, text } }

    // For each document, calculate segments and count annotations
    for (const doc of documentsResult) {
      const [annotationsResult] = await db.query(
        `SELECT id, start_offset, end_offset
         FROM annotations
         WHERE document_id = ? AND label_id = ?`,
        [doc.id, labelId]
      );

      if (annotationsResult.length === 0) continue;

      // For each annotation, find which segments it overlaps
      annotationsResult.forEach(ann => {
        const segments = getSegmentsForAnnotation(ann.start_offset, ann.end_offset);
        
        segments.forEach(segmentIndex => {
          const key = `${doc.id}_${segmentIndex}`;
          
          if (!segmentStats[key]) {
            const startChar = segmentIndex * SEGMENT_SIZE;
            const endChar = Math.min(startChar + SEGMENT_SIZE, doc.content.length);
            
            segmentStats[key] = {
              documentId: doc.id,
              segmentIndex,
              startChar,
              endChar,
              text: doc.content.substring(startChar, endChar),
              annotationCount: 0,
              annotationIds: []
            };
          }
          
          segmentStats[key].annotationCount++;
          segmentStats[key].annotationIds.push(ann.id);
        });
      });
    }

    // Convert to array and sort by annotation count
    const topSegments = Object.values(segmentStats)
      .sort((a, b) => b.annotationCount - a.annotationCount)
      .slice(0, parseInt(topN));

    res.json({
      labelId,
      topSegments
    });
  } catch (err) {
    console.error("Error fetching segments:", err);
    res.status(500).json({ message: "Error fetching segments", error: err.message });
  }
});

export default router;
