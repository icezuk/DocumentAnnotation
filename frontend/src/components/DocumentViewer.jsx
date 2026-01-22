import { useState } from "react";

function DocumentViewer({ text }) {
  const [highlightedText, setHighlightedText] = useState(text);
  const [lastSelection, setLastSelection] = useState("");

  function handleMouseUp() {
    const selection = window.getSelection();
    const selected = selection.toString();

    if (!selected) return;

    // Escape special characters for regex
    const escaped = selected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const highlighted = text.replace(
      new RegExp(escaped, "g"),
      `<mark>${selected}</mark>`
    );

    setHighlightedText(highlighted);
    setLastSelection(selected);

    selection.removeAllRanges();
  }

  return (
    <div>
      <div
        onMouseUp={handleMouseUp}
        style={{
          border: "1px solid #ccc",
          padding: "10px",
          whiteSpace: "pre-wrap",
          cursor: "text"
        }}
        dangerouslySetInnerHTML={{ __html: highlightedText }}
      />

      {lastSelection && (
        <p>
          <strong>Highlighted:</strong> {lastSelection}
        </p>
      )}
    </div>
  );
}

export default DocumentViewer;
