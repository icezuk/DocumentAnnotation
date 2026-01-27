import { db } from "./db.js";

/**
 * Normalize relation based on relation_type
 * Returns { parentId, childId }
 */
export function normalizeRelation(fromLabelId, toLabelId, relationType) {
  if (relationType === "child_to_parent") {
    return { parentId: toLabelId, childId: fromLabelId };
  } else if (relationType === "parent_to_child") {
    return { parentId: fromLabelId, childId: toLabelId };
  } else {
    throw new Error("Invalid relation_type. Must be 'child_to_parent' or 'parent_to_child'");
  }
}

/**
 * Check if a label already has a parent (single parent constraint)
 */
export async function getDirectParent(childId) {
  try {
    const [rows] = await db.query(
      `SELECT from_label_id, to_label_id, relation_type 
       FROM label_relations 
       WHERE (
         (relation_type = 'child_to_parent' AND from_label_id = ?) OR
         (relation_type = 'parent_to_child' AND to_label_id = ?)
       )`
      , [childId, childId]
    );

    if (rows.length === 0) return null;

    const row = rows[0];
    const { parentId } = normalizeRelation(row.from_label_id, row.to_label_id, row.relation_type);
    return parentId;
  } catch (err) {
    throw new Error(`Error fetching parent: ${err.message}`);
  }
}

/**
 * Check if a child can be added (must not already have a parent)
 */
export async function canAddChild(parentId, childId) {
  if (parentId === childId) {
    return { valid: false, error: "A label cannot be its own parent" };
  }

  // Check if child already has a parent
  const existingParent = await getDirectParent(childId);
  if (existingParent !== null) {
    return { valid: false, error: `Label ${childId} already has parent ${existingParent}. Single parent only.` };
  }

  return { valid: true };
}

/**
 * Check if potentialAncestorId is an ancestor of labelId (prevent circular references)
 */
export async function isAncestor(potentialAncestorId, labelId) {
  if (potentialAncestorId === labelId) return true;

  try {
    const parent = await getDirectParent(labelId);
    if (parent === null) return false;
    if (parent === potentialAncestorId) return true;

    // Recursively check ancestors
    return await isAncestor(potentialAncestorId, parent);
  } catch (err) {
    console.error("Error checking ancestor:", err.message);
    return false;
  }
}

/**
 * Add parent-child relationship
 */
export async function addParentChild(parentId, childId, relationType = "parent_to_child") {
  try {
    // Validate can add
    const canAdd = await canAddChild(parentId, childId);
    if (!canAdd.valid) {
      throw new Error(canAdd.error);
    }

    // Check for circular references
    const isCircular = await isAncestor(childId, parentId);
    if (isCircular) {
      throw new Error(`Cannot add relationship: Would create circular reference (${childId} is ancestor of ${parentId})`);
    }

    // Normalize and insert
    const { parentId: normParent, childId: normChild } = normalizeRelation(parentId, childId, relationType);
    
    // Determine how to store based on relation_type
    const [result] = await db.query(
      `INSERT INTO label_relations (from_label_id, to_label_id, relation_type) 
       VALUES (?, ?, ?)`,
      relationType === "parent_to_child" 
        ? [normParent, normChild, "parent_to_child"]
        : [normChild, normParent, "child_to_parent"]
    );

    return { id: result.insertId, parentId: normParent, childId: normChild };
  } catch (err) {
    throw new Error(`Error adding parent-child relationship: ${err.message}`);
  }
}

/**
 * Remove parent-child relationship
 */
export async function removeParentChild(parentId, childId) {
  try {
    const [result] = await db.query(
      `DELETE FROM label_relations 
       WHERE (
         (relation_type = 'parent_to_child' AND from_label_id = ? AND to_label_id = ?) OR
         (relation_type = 'child_to_parent' AND from_label_id = ? AND to_label_id = ?)
       )`,
      [parentId, childId, childId, parentId]
    );

    if (result.affectedRows === 0) {
      throw new Error(`No relationship found between parent ${parentId} and child ${childId}`);
    }

    return { success: true, message: "Relationship removed" };
  } catch (err) {
    throw new Error(`Error removing relationship: ${err.message}`);
  }
}

/**
 * Get direct children of a label
 */
export async function getDirectChildren(parentId) {
  try {
    const [rows] = await db.query(
      `SELECT from_label_id, to_label_id, relation_type 
       FROM label_relations 
       WHERE (
         (relation_type = 'parent_to_child' AND from_label_id = ?) OR
         (relation_type = 'child_to_parent' AND to_label_id = ?)
       )`,
      [parentId, parentId]
    );

    return rows.map(row => {
      const { childId } = normalizeRelation(row.from_label_id, row.to_label_id, row.relation_type);
      return childId;
    });
  } catch (err) {
    throw new Error(`Error fetching children: ${err.message}`);
  }
}

/**
 * Build hierarchical tree for a label (recursively)
 */
export async function buildLabelTree(labelId) {
  try {
    // Get label data
    const [labelRows] = await db.query("SELECT * FROM labels WHERE id = ?", [labelId]);
    if (labelRows.length === 0) {
      throw new Error(`Label ${labelId} not found`);
    }

    const label = labelRows[0];
    const children = await getDirectChildren(labelId);

    // Recursively build children trees
    const childrenTrees = await Promise.all(
      children.map(childId => buildLabelTree(childId))
    );

    return {
      id: label.id,
      name: label.name,
      color: label.color,
      children: childrenTrees
    };
  } catch (err) {
    throw new Error(`Error building label tree: ${err.message}`);
  }
}

/**
 * Get all root labels (labels with no parent)
 */
export async function getAllRootLabels() {
  try {
    // Get all labels
    const [allLabels] = await db.query("SELECT * FROM labels");

    // Filter labels that don't have a parent
    const rootLabels = [];
    for (const label of allLabels) {
      const parent = await getDirectParent(label.id);
      if (parent === null) {
        rootLabels.push(label.id);
      }
    }

    // Build trees for each root label
    const trees = await Promise.all(
      rootLabels.map(labelId => buildLabelTree(labelId))
    );

    return trees;
  } catch (err) {
    throw new Error(`Error getting all root labels: ${err.message}`);
  }
}

/**
 * Get path from label to root (breadcrumb)
 */
export async function getPathToRoot(labelId) {
  const path = [];
  let currentId = labelId;

  try {
    while (currentId !== null) {
      const [rows] = await db.query("SELECT id, name FROM labels WHERE id = ?", [currentId]);
      if (rows.length === 0) break;

      path.unshift({ id: rows[0].id, name: rows[0].name });
      currentId = await getDirectParent(currentId);
    }

    return path;
  } catch (err) {
    throw new Error(`Error getting path to root: ${err.message}`);
  }
}
