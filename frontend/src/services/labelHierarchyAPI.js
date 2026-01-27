const BASE_URL = "http://localhost:3000/api";

/**
 * Fetch label hierarchy for a user
 */
export async function fetchLabelHierarchy(userId) {
  try {
    const response = await fetch(`${BASE_URL}/labels/hierarchy/all/${userId}`);
    if (!response.ok) {
      throw new Error("Failed to fetch label hierarchy");
    }
    return await response.json();
  } catch (err) {
    console.error("Error fetching label hierarchy:", err);
    throw err;
  }
}

/**
 * Create a new label
 */
export async function createLabel(name, color, userId) {
  try {
    const response = await fetch(`${BASE_URL}/labels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color, user_id: userId })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create label");
    }

    return await response.json();
  } catch (err) {
    console.error("Error creating label:", err);
    throw err;
  }
}

/**
 * Create a parent-child relationship between two labels
 * This makes childId a child of parentId
 */
export async function addParentChildRelationship(parentId, childId, userId) {
  try {
    const response = await fetch(
      `${BASE_URL}/labels/${parentId}/add-child/${childId}/${userId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relation_type: "parent_to_child" })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to add parent-child relationship");
    }

    return await response.json();
  } catch (err) {
    console.error("Error adding parent-child relationship:", err);
    throw err;
  }
}

/**
 * Create a new child label under a parent label
 * This is a convenience function that does both createLabel and addParentChildRelationship
 */
export async function createChildLabel(parentId, childName, childColor, userId) {
  try {
    // First, create the child label
    const newLabel = await createLabel(childName, childColor, userId);

    // Then, create the parent-child relationship
    await addParentChildRelationship(parentId, newLabel.id, userId);

    return newLabel;
  } catch (err) {
    console.error("Error creating child label:", err);
    throw err;
  }
}
