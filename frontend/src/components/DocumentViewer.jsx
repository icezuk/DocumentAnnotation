import React, { useEffect, useRef, useState } from "react";

export default function DocumentViewer({
  text = "",
  labels = [],
  annotations = [],
  onAdd
}) {
  const containerRef = useRef(null);
  const [selectedLabelId, setSelectedLabelId] = useState("");
  const [html, setHtml] = useState("");

  // keep selected label valid
  useEffect(() => {
    if (labels.length && !labels.find(l => l.id === selectedLabelId)) {
      setSelectedLabelId(labels[0].id);
    }
    if (!labels.length) setSelectedLabelId("");
  }, [labels, selectedLabelId]);

  // rebuild HTML from annotations
  useEffect(() => {
    if (!annotations.length) {
      setHtml(escapeHtml(text));
      return;
    }

    let out = escapeHtml(text);

    annotations.forEach(a => {
      const inner = escapeHtml(a.text);
      const idx = out.indexOf(inner);
      if (idx !== -1) {
        out =
          out.slice(0, idx) +
          `<span class="annotation"
             data-annotation-id="${a.id}"
             data-label="${escapeHtml(a.label)}"
             style="
               background:${a.color};
               padding:2px 6px;
               border-radius:6px;
               box-decoration-break:clone;
               -webkit-box-decoration-break:clone;
             "
          >${inner}</span>` +
          out.slice(idx + inner.length);
      }
    });

    setHtml(out);
  }, [annotations, text]);

  function handleMouseUp() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;

    const range = sel.getRangeAt(0);

    if (!containerRef.current.contains(range.commonAncestorContainer)) {
      sel.removeAllRanges();
      return;
    }

    if (!labels.length) {
      alert("Please create a label first.");
      sel.removeAllRanges();
      return;
    }

    const labelObj = labels.find(l => l.id === selectedLabelId) || labels[0];
    if (!labelObj) return;

    const selectedText = sel.toString();
    if (!selectedText.trim()) {
      sel.removeAllRanges();
      return;
    }

    const id = Math.random().toString(36).slice(2, 9);

    // 🔥 РАБОТЕЩ MULTI-LINE HIGHLIGHT
    const wrapper = document.createElement("span");
    wrapper.className = "annotation";
    wrapper.dataset.annotationId = id;
    wrapper.dataset.label = labelObj.name;
    wrapper.style.backgroundColor = labelObj.color;
    wrapper.style.padding = "2px 6px";
    wrapper.style.borderRadius = "6px";
    wrapper.style.boxDecorationBreak = "clone";
    wrapper.style.webkitBoxDecorationBreak = "clone";

    wrapper.appendChild(range.cloneContents());
    range.deleteContents();
    range.insertNode(wrapper);

    onAdd?.({
      id,
      label: labelObj.name,
      color: labelObj.color,
      text: selectedText
    });

    sel.removeAllRanges();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="viewer-controls">
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ fontSize: 13 }}>Label:</label>
          <select
            className="label-select"
            value={selectedLabelId}
            onChange={e => setSelectedLabelId(e.target.value)}
            disabled={!labels.length}
          >
            {!labels.length && <option>No labels</option>}
            {labels.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="viewer" ref={containerRef} onMouseUp={handleMouseUp}>
        <div
          className="document-content"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
