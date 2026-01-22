import { useState } from "react";

const LABELS = [
  { name: "Person", color: "#ffd54f" },
  { name: "Location", color: "#81d4fa" },
  { name: "Organization", color: "#a5d6a7" }
];

function DocumentViewer({ text }) {
  const [highlightedText, setHighlightedText] = useState(text);
  const [selectedLabel, setSelectedLabel] = useState(LABELS[0]);

  function handleMouseUp() {
    const selection = window.getSelection();
    const selected = selection.toString();

    if (!selected) return;

    const escaped = selected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const highlighted = highlightedText.replace(
      new RegExp(escaped, "g"),
      `<span style="background-color:${selectedLabel.color}; padding:2px;">${selected}</span>`
    );

    setHighlightedText(highlighted);
    selection.removeAllRanges();
  }

  return (
    <div>
      <label>
        Label:&nbsp;
        <select
          value={selectedLabel.name}
          onChange={(e) =>
            setSelectedLabel(
              LABELS.find((l) => l.name === e.target.value)
            )
          }
        >
          {LABELS.map((label) => (
            <option key={label.name} value={label.name}>
              {label.name}
            </option>
          ))}
        </select>
      </label>

      <div
        onMouseUp={handleMouseUp}
        style={{
          marginTop: "10px",
          border: "1px solid #ccc",
          padding: "10px",
          whiteSpace: "pre-wrap",
          cursor: "text"
        }}
        dangerouslySetInnerHTML={{ __html: highlightedText }}
      />
    </div>
  );
}

export default DocumentViewer;
