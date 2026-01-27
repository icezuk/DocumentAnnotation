const BASE_URL = "http://localhost:3000/api";

function authFetch(path, { token, ...options } = {}) {
  return fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

export async function uploadDocument(file, token) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await authFetch("/documents/upload", {
    token,
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Upload failed");
  }

  return response.json(); // { id, title, fileType }
}

export async function fetchDocumentContent(documentId, token) {
  const response = await authFetch(`/documents/${documentId}/content`, { token });

  if (!response.ok) {
    throw new Error("Failed to fetch document content");
  }

  return response.json(); // { content }
}

export async function fetchMyDocuments(token) {
  const response = await authFetch("/documents", { token });

  if (!response.ok) {
    throw new Error("Failed to fetch documents");
  }

  return response.json(); // array of documents
}

export async function loginUser(username, password) {
  const response = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error("Invalid credentials");
  }

  return response.json(); // { token }
}

export async function registerUser(username, password) {
  const response = await fetch("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  if (response.status === 409) {
    throw new Error("Username already exists");
  }

  if (!response.ok) {
    throw new Error("Registration failed");
  }

  return response.json(); // { message: "User created" }
}