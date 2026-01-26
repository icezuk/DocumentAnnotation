const BASE_URL = "http://localhost:3000/api";

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${BASE_URL}/documents/upload`, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    throw new Error("Upload failed");
  }

  return response.json(); // { id, title, fileType }
}

export async function fetchDocumentContent(documentId) {
  const response = await fetch(
    `${BASE_URL}/documents/${documentId}/content`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch document content");
  }

  return response.json(); // { content }
}