import React, { useState } from "react";
import DocumentViewer from "./DocumentViewer";
import Sidebar from "./Sidebar";

export default function DocumentUpload() {
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [labels, setLabels] = useState([]);
  const [annotations, setAnnotations] = useState([]);

  function handleFile(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;

    setTitle(f.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      setText(String(ev.target.result || ""));
      setLabels([]);
      setAnnotations([]);
    };
    reader.readAsText(f);
  }

  function handleAddAnnotation(a) {
    if (a && a.__reset) {
      setAnnotations([]);
      return;
    }
    setAnnotations((prev) => [...prev, a]);
  }

  function handleAddLabel(l) {
    setLabels((prev) => [...prev, l]);
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
          />
        </div>
      </div>
    </div>
  );
}
