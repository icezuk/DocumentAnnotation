const BASE_URL = "http://localhost:3000/api";

/**
 * Fetch label hierarchy (for the logged-in user)
 */
export async function fetchLabelHierarchy(token) {
  const response = await fetch(`${BASE_URL}/labels/hierarchy/all`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error("Failed to fetch label hierarchy");
  }

  return response.json();
}

/**
 * Create a new root label
 */
export async function createLabel(data, token) {
  const response = await fetch(`${BASE_URL}/labels`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data) // { name, color }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create label");
  }

  return response.json();
}

/**
 * Create parent-child relationship
 */
export async function addParentChildRelationship(parentId, childId, token) {
  const response = await fetch(
    `${BASE_URL}/labels/${parentId}/add-child/${childId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ relation_type: "parent_to_child" })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to add parent-child relationship");
  }

  return response.json();
}

/**
 * Create a child label under a parent label
 */
export async function createChildLabel(parentId, data, token) {
  // 1. create label
  const newLabel = await createLabel(data, token);

  // 2. link it as child
  await addParentChildRelationship(parentId, newLabel.id, token);

  return newLabel;
}

/**
 * Update label
 */
export async function updateLabel(id, name, color, token) {
  const res = await fetch(`${BASE_URL}/labels/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ name, color })
  });

  if (!res.ok) throw new Error("Failed to update label");
  return res.json();
}

/**
 * Delete label
 */
export async function deleteLabel(id, token) {
  const res = await fetch(`${BASE_URL}/labels/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) throw new Error("Failed to delete label");
}