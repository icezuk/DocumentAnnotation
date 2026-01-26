import React, { useRef, useState, useEffect } from "react";
import DocumentViewer from "./DocumentViewer";
import Sidebar from "./Sidebar";
import { uploadDocument, fetchDocumentContent } from "../services/api";

/* palette for suggested label colors */
const LABEL_COLORS = [
  "#2563eb", "#16a34a", "#dc2626", "#7c3aed",
  "#ea580c", "#0891b2", "#ca8a04", "#db2777",
];

function makeId(prefix = "") {
  return prefix + Math.random().toString(36).slice(2, 9);
}

export default function DocumentUpload() {
  const fileInputRef = useRef(null);

  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [annotations, setAnnotations] = useState([]);

  // global labels (shared across documents)
  const [labels, setLabels] = useState(() => {
    try { return JSON.parse(localStorage.getItem("labels") || "null") || []; } catch { return []; }
  });

  // documents: array of { id, title, text, annotations: [{id,start,end,text,label,color}] }
  const [documents, setDocuments] = useState([]);
  const [activeDocId, setActiveDocId] = useState(null);

  useEffect(() => {
    localStorage.setItem("labels", JSON.stringify(labels));
  }, [labels]);

  function getNextLabelColor() {
    return LABEL_COLORS[labels.length % LABEL_COLORS.length];
  }

  // open file picker (we use hidden ref)
  function openFilePicker() {
    fileInputRef.current && fileInputRef.current.click();
  }

  // handle file load -> create new document
  async function handleFile(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;

    try {
      // upload to backend
      const uploadResult = await uploadDocument(f);

      // get content from backend
      const contentResult = await fetchDocumentContent(uploadResult.id);

      // create document object
      const newDoc = {
        id: uploadResult.id,
        title: uploadResult.title || f.name,
        text: contentResult.content,
        annotations: []
      };

      // add to documents + make active
      setDocuments(prev => [...prev, newDoc]);
      setActiveDocId(newDoc.id);

    } catch (err) {
      console.error("Upload failed:", err);
      alert("Failed to upload or load document.");
    }
  }

  // add annotation to the active document (offset-based annotation object)
  function handleAddAnnotation(a) {
    // a = { id, start, end, text, label, color } or { __reset: true }
    if (!activeDocId) return;
    setDocuments(prev => prev.map(doc => {
      if (doc.id !== activeDocId) return doc;
      if (a && a.__reset) {
        return { ...doc, annotations: [] };
      }
      // check overlap
      const overlap = doc.annotations.some(an => !(a.end <= an.start || a.start >= an.end));
      if (overlap) {
        alert("This selection overlaps an existing annotation. Please select a non-overlapping range.");
        return doc;
      }
      const nextAnns = [...doc.annotations, a].sort((x, y) => x.start - y.start);
      return { ...doc, annotations: nextAnns };
    }));
  }

  // add global label (keeps same across docs)
  function handleAddLabel(l) {
    const color = l.color || getNextLabelColor();
    const labelObj = { ...l, color, id: l.id || makeId("lbl_") };
    // prevent duplicate names
    if (labels.some(x => x.name.toLowerCase() === labelObj.name.toLowerCase())) {
      alert("Label with this name already exists.");
      return;
    }
    setLabels(prev => [...prev, labelObj]);
  }

  // close a document tab
  function closeDocument(docId) {
    if (!confirm("Close this document? Your annotations for this file will be removed from workspace (they won't be exported).")) return;
    setDocuments(prev => {
      const filtered = prev.filter(d => d.id !== docId);
      if (!filtered.length) {
        setActiveDocId(null);
      } else if (docId === activeDocId) {
        setActiveDocId(filtered[filtered.length - 1].id);
      }
      return filtered;
    });
  }

  // helper: get active document object
  const activeDoc = documents.find(d => d.id === activeDocId) || null;

  // export all docs metadata (optional)
  function exportAll() {
    const data = documents.map(d => ({ id: d.id, title: d.title, annotations: d.annotations }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "project-documents.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="app-container" style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column" }}>

      {/* ===== TOP BAR (TABS + ACTIONS) ===== */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          borderBottom: "1px solid #e5e7eb",
          background: "#ffffff",
          flexShrink: 0
        }}
      >
        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {documents.map(doc => (
            <div
              key={doc.id}
              onClick={() => setActiveDocId(doc.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 10px",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 13,
                background: doc.id === activeDocId ? "#2563eb" : "#f1f5f9",
                color: doc.id === activeDocId ? "#ffffff" : "#0f172a"
              }}
            >
              <span>{doc.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeDocument(doc.id);
                }}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: "inherit",
                  fontSize: 13
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.pdf,.docx"
            onChange={handleFile}
            style={{ display: "none" }}
          />
          <button className="btn" onClick={openFilePicker}>Add file</button>
          <button className="btn btn-ghost" onClick={exportAll}>Export all</button>
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div
        style={{
          flex: 1,
          display: "flex",
          gap: 12,
          padding: 12,
          minHeight: 0
        }}
      >
        {/* Viewer */}
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          {activeDoc ? (
            <DocumentViewer
              key={activeDoc.id}
              text={activeDoc.text}
              labels={labels}
              annotations={activeDoc.annotations}
              onAdd={handleAddAnnotation}
            />
          ) : (
            <div style={{ padding: 24, color: "#64748b" }}>
              Please upload a .txt, .pdf or .docx file to start annotating.
            </div>
          )}
        </div>

        {/* Sidebar */}
        <Sidebar
          labels={labels}
          annotations={activeDoc ? activeDoc.annotations : []}
          allAnnotations={documents.flatMap(d => d.annotations)}
          suggestedColor={getNextLabelColor()}
          onAddLabel={handleAddLabel}
          onScrollToAnnotation={(id) => {
            const el = document.querySelector(`[data-annotation-id="${id}"]`);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
        />
      </div>
    </div>
  );

}
