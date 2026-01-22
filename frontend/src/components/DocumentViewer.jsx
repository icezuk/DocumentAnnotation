import { useState } from "react";

function DocumentViewer({ text }) {
  const [selectedText, setSelectedText] = useState("");

  function handleMouseUp() {
    const selection = window.getSelection();
    const text = selection.toString();

    if (text.length > 0) {
      setSelectedText(text);
    }
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
      >
        {text}
      </div>

      {selectedText && (
        <div style={{ marginTop: "10px" }}>
          <strong>Selected text:</strong>
          <p>{selectedText}</p>
        </div>
      )}
    </div>
  );
}

export default DocumentViewer;