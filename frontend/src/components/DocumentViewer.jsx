import React, { useEffect, useRef, useState } from "react";

/*
 Props:
  - text: original document text (string)
  - labels: [{id, name, color}]
  - annotations: [{id, start, end, text, label, color}]
  - onAdd: fn(annotation)  -> expects {id, start, end, text, label, color}
*/
export default function DocumentViewer({ text = "", labels = [], annotations = [], onAdd }) {
  const containerRef = useRef(null);
  const [selectedLabelId, setSelectedLabelId] = useState(labels[0]?.id || "");
  const [html, setHtml] = useState("");

  useEffect(() => {
    setHtml(escapeHtml(text));
  }, [text]);

  useEffect(() => {
    if (!labels.find(l => l.id === selectedLabelId)) {
      setSelectedLabelId(labels[0]?.id || "");
    }
  }, [labels, selectedLabelId]);

  // Build HTML from text + annotations (by offsets). Annotations must be non-overlapping.
  useEffect(() => {
    if (!annotations || annotations.length === 0) {
      setHtml(escapeHtml(text));
      return;
    }

    const anns = [...annotations].sort((a, b) => a.start - b.start);
    let out = "";
    let cursor = 0;

    anns.forEach(a => {
      const s = Math.max(0, Math.min(a.start, text.length));
      const e = Math.max(0, Math.min(a.end, text.length));
      if (cursor < s) {
        out += escapeHtml(text.slice(cursor, s));
      }
      const inner = escapeHtml(text.slice(s, e));
      out += `<span class="annotation" data-annotation-id="${a.id}" data-label="${escapeHtml(a.label)}" style="background:${a.color};padding:2px 6px;border-radius:6px;box-decoration-break:clone;-webkit-box-decoration-break:clone;">${inner}</span>`;
      cursor = e;
    });

    if (cursor < text.length) {
      out += escapeHtml(text.slice(cursor));
    }

    setHtml(out);
  }, [annotations, text]);

  // Helper: compute character offset within container/ref for a node+offset
  function getCharOffsetWithin(node, nodeOffset) {
    const walker = document.createTreeWalker(containerRef.current, NodeFilter.SHOW_TEXT, null);
    let charCount = 0;
    let n;
    while ((n = walker.nextNode())) {
      if (n === node) {
        return charCount + nodeOffset;
      }
      charCount += n.textContent.length;
    }
    return charCount;
  }

  function handleMouseUp() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;

    const range = sel.getRangeAt(0);

    // ensure selection is inside our container
    if (!containerRef.current.contains(range.commonAncestorContainer)) {
      sel.removeAllRanges();
      return;
    }

    if (!labels || labels.length === 0) {
      alert("Please create at least one label in the sidebar before annotating.");
      sel.removeAllRanges();
      return;
    }

    const startNode = range.startContainer;
    const startOffset = range.startOffset;
    const endNode = range.endContainer;
    const endOffset = range.endOffset;

    const startChar = getCharOffsetWithin(startNode, startOffset);
    const endChar = getCharOffsetWithin(endNode, endOffset);

    let s = Math.min(startChar, endChar);
    let e = Math.max(startChar, endChar);

    if (s === e) { sel.removeAllRanges(); return; }
    s = Math.max(0, Math.min(s, text.length));
    e = Math.max(0, Math.min(e, text.length));

    // prevent overlap with existing annotations
    const overlap = annotations.some(a => !(e <= a.start || s >= a.end));
    if (overlap) {
      alert("Selection overlaps an existing annotation. Please choose a different range.");
      sel.removeAllRanges();
      return;
    }

    const selectedText = text.slice(s, e);
    if (!selectedText.trim()) { sel.removeAllRanges(); return; }

    const labelObj = labels.find(l => l.id === selectedLabelId) || labels[0];
    if (!labelObj) { sel.removeAllRanges(); return; }

    const id = Math.random().toString(36).slice(2, 9);
    const ann = { id, start: s, end: e, text: selectedText, label: labelObj.name, color: labelObj.color };

    onAdd && onAdd(ann);

    sel.removeAllRanges();
  }

  function exportAnnotations() {
    const data = annotations.map(a => ({ id: a.id, start: a.start, end: a.end, text: a.text, label: a.label, color: a.color }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "annotations.json"; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="viewer-controls" style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ fontSize: 13, color: "#334155" }}>Label:&nbsp;</label>
          <select className="label-select" value={selectedLabelId || ""} onChange={e => setSelectedLabelId(e.target.value)} disabled={labels.length === 0}>
            {labels.length === 0 && <option value="">No labels</option>}
            {labels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost" onClick={exportAnnotations}>Export JSON</button>
          <button className="btn btn-primary" onClick={() => onAdd && onAdd({ __reset: true })}>Clear Highlights</button>
        </div>
      </div>

      <div className="viewer" ref={containerRef} onMouseUp={handleMouseUp}>
        <div className="document-content" style={{ whiteSpace: "pre-wrap" }} dangerouslySetInnerHTML={{ __html: html }} />
      </div>

      <div style={{ marginTop: 8, fontSize: 13, color: "#475569" }}>
        Tip: select text (multi-line supported) to create a highlight with the chosen label color.
      </div>
    </div>
  );
}

function escapeHtml(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
