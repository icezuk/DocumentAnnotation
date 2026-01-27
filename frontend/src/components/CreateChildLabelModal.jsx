import React, { useState } from "react";

/**
 * Modal for creating a new child label
 * Props:
 *   - isOpen: boolean - whether modal is visible
 *   - parentLabel: { id, name } - the parent label
 *   - onSubmit: fn({ name, color }) - callback when submitted
 *   - onClose: fn() - callback when closed
 *   - suggestedColor: string - default color to suggest
 *   - isLoading: boolean - show loading state
 */
export default function CreateChildLabelModal({
  isOpen = false,
  parentLabel = null,
  onSubmit,
  onClose,
  suggestedColor = "#2563eb",
  isLoading = false
}) {
  const [childName, setChildName] = useState("");
  const [childColor, setChildColor] = useState(suggestedColor);
  const [error, setError] = useState("");

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setChildName("");
      setChildColor(suggestedColor);
      setError("");
    }
  }, [isOpen, suggestedColor]);

  function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const name = childName.trim();
    if (!name) {
      setError("Please enter a label name.");
      return;
    }

    if (name.length > 100) {
      setError("Label name must be less than 100 characters.");
      return;
    }

    onSubmit({ name, color: childColor });
    setChildName("");
  }

  if (!isOpen || !parentLabel) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          zIndex: 999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        {/* Modal */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "white",
            borderRadius: 8,
            padding: 24,
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
            maxWidth: 400,
            width: "90%",
            zIndex: 1000
          }}
        >
          <h3 style={{ margin: "0 0 8px 0", color: "#1e293b" }}>
            Add Child Label to "{parentLabel.name}"
          </h3>

          <p style={{ margin: "0 0 16px 0", color: "#64748b", fontSize: 14 }}>
            Create a new label that will be a child of <strong>{parentLabel.name}</strong>.
          </p>

          <form onSubmit={handleSubmit}>
            {/* Label name input */}
            <div style={{ marginBottom: 16 }}>
              <label
                htmlFor="child-label-name"
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontWeight: 500,
                  color: "#334155",
                  fontSize: 14
                }}
              >
                Child Label Name
              </label>
              <input
                id="child-label-name"
                type="text"
                placeholder="e.g., Mammals, Birds, etc."
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                disabled={isLoading}
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  fontSize: 14,
                  boxSizing: "border-box"
                }}
              />
            </div>

            {/* Color picker */}
            <div style={{ marginBottom: 16 }}>
              <label
                htmlFor="child-label-color"
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontWeight: 500,
                  color: "#334155",
                  fontSize: 14
                }}
              >
                Label Color
              </label>
              <input
                id="child-label-color"
                type="color"
                value={childColor}
                onChange={(e) => setChildColor(e.target.value)}
                disabled={isLoading}
                style={{
                  width: 60,
                  height: 40,
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  cursor: "pointer"
                }}
              />
            </div>

            {/* Error message */}
            {error && (
              <div
                style={{
                  marginBottom: 16,
                  padding: 10,
                  borderRadius: 6,
                  background: "#fee2e2",
                  color: "#991b1b",
                  fontSize: 13
                }}
              >
                {error}
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                style={{
                  padding: "10px 16px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  background: "white",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  padding: "10px 16px",
                  borderRadius: 6,
                  border: "none",
                  background: "#2563eb",
                  color: "white",
                  fontWeight: 500,
                  cursor: isLoading ? "not-allowed" : "pointer",
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                {isLoading ? "Creating..." : "Create Child"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
