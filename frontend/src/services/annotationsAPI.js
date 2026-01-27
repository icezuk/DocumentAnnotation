const BASE_URL = "http://localhost:3000/api";

/**
 * Fetch all annotations for a document
 */
export async function fetchAnnotationsForDocument(documentId, userId) {
  try {
    const response = await fetch(`${BASE_URL}/annotations/document/${documentId}/${userId}`);
    if (!response.ok) {
      throw new Error("Failed to fetch annotations");
    }
    return await response.json();
  } catch (err) {
    console.error("Error fetching annotations:", err);
    throw err;
  }
}

/**
 * Create a new annotation in the database
 */
export async function createAnnotation(documentId, labelId, startOffset, endOffset, selectedText, userId) {
  try {
    const response = await fetch(`${BASE_URL}/annotations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        document_id: documentId,
        label_id: labelId,
        start_offset: startOffset,
        end_offset: endOffset,
        selected_text: selectedText,
        user_id: userId
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create annotation");
    }

    return await response.json();
  } catch (err) {
    console.error("Error creating annotation:", err);
    throw err;
  }
}

/**
 * Delete an annotation from the database
 */
export async function deleteAnnotation(annotationId, userId) {
  try {
    const response = await fetch(`${BASE_URL}/annotations/${annotationId}/${userId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete annotation");
    }

    return await response.json();
  } catch (err) {
    console.error("Error deleting annotation:", err);
    throw err;
  }
}
