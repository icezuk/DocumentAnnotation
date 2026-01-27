import express from "express";
import { db } from "../db.js";
import {
  addParentChild,
  removeParentChild,
  getDirectParent,
  getDirectChildren,
  buildLabelTree,
  getAllRootLabels,
  getPathToRoot
} from "../labelHierarchy.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

/* =========================
   IMPORTANT: Routes must be ordered from MOST specific to LEAST specific
   This ensures /hierarchy/all/:userId matches before //:id
========================= */

/* =========================
   GET LABEL HIERARCHY (ALL TREES) FOR USER
========================= */
router.get("/hierarchy/all", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const trees = await getAllRootLabels(userId);
    res.json(trees);
  } catch (err) {
    console.error("Error fetching hierarchy:", err.message);
    res.status(500).json({ message: "Error fetching hierarchy", error: err.message });
  }
});

/* =========================
   GET LABEL HIERARCHY (ALL TREES) - DEPRECATED
========================= */
// router.get("/hierarchy/all", async (req, res) => {
//   try {
//     const trees = await getAllRootLabels();
//     res.json(trees);
//   } catch (err) {
//     console.error("Error fetching hierarchy:", err.message);
//     res.status(500).json({ message: "Error fetching hierarchy", error: err.message });
//   }
// });

/* =========================
   GET ALL LABELS FOR USER
========================= */
router.get("/user", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const [labels] = await db.query("SELECT * FROM labels WHERE user_id = ?", [userId]);
    res.json(labels);
  } catch (err) {
    console.error("Error fetching labels:", err.message);
    res.status(500).json({ message: "Error fetching labels", error: err.message });
  }
});

/* =========================
   CREATE NEW LABEL
========================= */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, color} = req.body;

    if (!name) {
      return res.status(400).json({ message: "Label name is required" });
    }

    const [result] = await db.query(
      "INSERT INTO labels (name, color, user_id) VALUES (?, ?, ?)",
      [name, color || null, userId]
    );

    res.status(201).json({
      id: result.insertId,
      name,
      color: color || null,
      user_id: userId
    });
  } catch (err) {
    console.error("Error creating label:", err.message);
    res.status(500).json({ message: "Error creating label", error: err.message });
  }
});

/* =========================
   ADD PARENT-CHILD RELATIONSHIP
========================= */
router.post("/:parentId/add-child/:childId", authMiddleware, async (req, res) => {
  try {
    const parentId = parseInt(req.params.parentId);
    const childId = parseInt(req.params.childId);
    const userId = req.user.id;
    const relationType = req.body.relation_type || "parent_to_child";

    const result = await addParentChild(parentId, childId, userId, relationType);
    res.status(201).json({
      message: "Parent-child relationship added",
      ...result
    });
  } catch (err) {
    console.error("Error adding relationship:", err.message);
    res.status(400).json({ message: "Error adding relationship", error: err.message });
  }
});

/* =========================
   REMOVE PARENT-CHILD RELATIONSHIP
========================= */
router.delete("/:parentId/remove-child/:childId", async (req, res) => {
  try {
    const parentId = parseInt(req.params.parentId);
    const childId = parseInt(req.params.childId);

    const result = await removeParentChild(parentId, childId);
    res.json(result);
  } catch (err) {
    console.error("Error removing relationship:", err.message);
    res.status(400).json({ message: "Error removing relationship", error: err.message });
  }
});

/* =========================
   GET LABEL WITH TREE (by ID)
========================= */
router.get("/:id/tree", async (req, res) => {
  try {
    const tree = await buildLabelTree(parseInt(req.params.id));
    res.json(tree);
  } catch (err) {
    console.error("Error building tree:", err.message);
    res.status(500).json({ message: "Error building tree", error: err.message });
  }
});

/* =========================
   GET PARENT OF LABEL
========================= */
router.get("/:id/parent", async (req, res) => {
  try {
    const parentId = await getDirectParent(parseInt(req.params.id));
    if (parentId === null) {
      return res.json({ parentId: null, message: "This is a root label" });
    }

    const [label] = await db.query("SELECT * FROM labels WHERE id = ?", [parentId]);
    res.json(label[0]);
  } catch (err) {
    console.error("Error fetching parent:", err.message);
    res.status(500).json({ message: "Error fetching parent", error: err.message });
  }
});

/* =========================
   GET CHILDREN OF LABEL
========================= */
router.get("/:id/children", async (req, res) => {
  try {
    const childrenIds = await getDirectChildren(parseInt(req.params.id));
    const [children] = await db.query(
      "SELECT * FROM labels WHERE id IN (?)",
      [childrenIds.length > 0 ? childrenIds : [0]]
    );
    res.json(children);
  } catch (err) {
    console.error("Error fetching children:", err.message);
    res.status(500).json({ message: "Error fetching children", error: err.message });
  }
});

/* =========================
   GET PATH TO ROOT (BREADCRUMB)
========================= */
router.get("/:id/path", authMiddleware, async (req, res) => {
  try {
    const labelId = parseInt(req.params.id);
    const userId = req.user.id;
    const path = await getPathToRoot(labelId, userId);
    res.json(path);
  } catch (err) {
    console.error("Error fetching path:", err.message);
    res.status(500).json({ message: "Error fetching path", error: err.message });
  }
});

/* =========================
   GET ALL LABELS (DEPRECATED - use /user/:userId instead)
========================= */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const [labels] = await db.query("SELECT * FROM labels WHERE user_id = ?",
      [userId]
    );
    res.json(labels);
  } catch (err) {
    console.error("Error fetching labels:", err.message);
    res.status(500).json({ message: "Error fetching labels", error: err.message });
  }
});

export default router;