import React, { useState } from "react";
import DocumentViewer from "./DocumentViewer";
import Sidebar from "./Sidebar";

/* palette for suggested colors */
const LABEL_COLORS = [
  "#2563eb", "#16a34a", "#dc2626", "#7c3aed",
  "#ea580c", "#0891b2", "#ca8a04", "#db2777",
];

export default function DocumentUpload() {
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [labels, setLabels] = useState([]); // {id,name,color}
  const [annotations, setAnnotations] = useState([]); // {id,start,end,text,label,color}

  function getNextLabelColor() {
    return LABEL_COLORS[labels.length % LABEL_COLORS.length];
  }

  function handleFile(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;

    setTitle(f.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = String(ev.target.result || "");
      setText(content);
      // reset per-document state
      setLabels([]);
      setAnnotations([]);
    };
    reader.readAsText(f);
  }

  function handleAddAnnotation(a) {
    // a = { start, end, text, label, color, id }
    if (a && a.__reset) {
      setAnnotations([]);
      return;
    }
    // prevent overlap with existing annotations
    const overlap = annotations.some((an) => !(a.end <= an.start || a.start >= an.end));
    if (overlap) {
      alert("This selection overlaps an existing annotation. Please select a non-overlapping range.");
      return;
    }
    setAnnotations((prev) => [...prev, a].sort((x, y) => x.start - y.start));
  }

  function handleAddLabel(l) {
    // l should be { id, name, color? }
    const color = l.color || getNextLabelColor();
    const labelObj = { ...l, color };
    setLabels((prev) => [...prev, labelObj]);
  }

  function handleScrollToAnnotation(id) {
    const el = document.querySelector(`[data-annotation-id="${id}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div style={{ width: "100%" }} className="app-container">
      <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 12 }}>
        <div className="upload-controls">
          <input type="file" accept=".txt" onChange={handleFile} />
          <div style={{ color: "#475569", fontSize: 13 }}>{title || "No document loaded"}</div>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "stretch", height: "100%" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div className="main" style={{ minHeight: 0 }}>
              {text ? (
                <DocumentViewer
                  text={text}
                  labels={labels}
                  annotations={annotations}
                  onAdd={handleAddAnnotation}
                />
              ) : (
                <div style={{ padding: 24, color: "#64748b" }}>Please upload a .txt file to start annotating.</div>
              )}
            </div>
          </div>

          <Sidebar
            labels={labels}
            annotations={annotations}
            onAddLabel={handleAddLabel}
            onScrollToAnnotation={handleScrollToAnnotation}
            suggestedColor={getNextLabelColor()}
          />
        </div>
      </div>
    </div>
  );
}
