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

/**
 * Fetch analytics summary (labels, total annotations, average length, etc.)
 */
export async function fetchAnalyticsSummary(token) {
  const response = await authFetch("/analytics/labels-summary", { token });

  if (!response.ok) {
    throw new Error("Failed to fetch analytics summary");
  }

  return response.json();
}

/**
 * Fetch top segments with highest annotation concentration for a selected label
 * @param {number} labelId - The ID of the label to analyze
 * @param {number} topN - Number of top segments to return (default: 10)
 * @param {string} token - Auth token
 */
export async function fetchTopSegments(labelId, topN = 10, token) {
  const response = await authFetch(
    `/analytics/segments?labelId=${labelId}&topN=${topN}`,
    { token }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch segments");
  }

  return response.json();
}
