import React, { useEffect, useState } from "react";

/*
Props:
  labels: [{id,name,color}]
  annotations: [{id,start,end,text,label,color}] - for active doc
  onAddLabel: fn({id,name,color})
  onScrollToAnnotation: fn(id)
  suggestedColor: string
  allAnnotations: array (optional) - across docs (for totals)
*/
export default function Sidebar({
  labels = [],
  annotations = [],
  onAddLabel,
  onScrollToAnnotation,
  suggestedColor = "#2563eb",
  allAnnotations = []
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(suggestedColor);
  const [error, setError] = useState("");

  useEffect(() => {
    setColor(suggestedColor || "#2563eb");
  }, [suggestedColor]);

  function handleAdd() {
    const n = name.trim();
    if (!n) {
      setError("Please enter a label name.");
      return;
    }
    if (labels.some(l => l.name.toLowerCase() === n.toLowerCase())) {
      setError("Label with this name already exists.");
      return;
    }
    const id = n.toLowerCase().replace(/\s+/g, "_") + "_" + Math.random().toString(36).slice(2, 7);
    onAddLabel && onAddLabel({ id, name: n, color });
    setName("");
    setError("");
    // rotate color for next suggestion (simple heuristic)
    const palette = ["#2563eb", "#16a34a", "#dc2626", "#7c3aed", "#ea580c", "#0891b2", "#ca8a04", "#db2777"];
    const idx = palette.indexOf(color);
    setColor(palette[(idx + 1 + palette.length) % palette.length]);
  }

  // group annotations by label name (current doc)
  const grouped = labels.reduce((acc, l) => {
    acc[l.name] = (annotations || []).filter(a => a.label === l.name);
    return acc;
  }, {});

  // totals across docs (if provided)
  const totals = labels.reduce((acc, l) => {
    acc[l.name] = (allAnnotations || []).filter(a => a.label === l.name).length;
    return acc;
  }, {});

  return (
    <aside className="sidebar" aria-label="Labels and annotations">
      <h3 style={{ margin: 0 }}>Labels</h3>

      <div style={{ marginTop: 10 }}>
        {labels.length === 0 && (
          <div style={{ color: "#64748b", fontSize: 13, marginBottom: 8 }}>
            No labels yet — create one to start annotating.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {labels.map(l => (
            <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 8, borderRadius: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 16, height: 16, borderRadius: 4, background: l.color, border: "1px solid rgba(0,0,0,0.06)" }} />
                <div>
                  <div style={{ fontWeight: 600 }}>{l.name}</div>
                  <div style={{ fontSize: 13, color: "#64748b" }}>{(grouped[l.name] || []).length} highlights (total: {totals[l.name] || 0})</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: "#64748b" }}></div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: 8 }} />

      <div style={{ fontSize: 13, color: "#475569" }}>Add new label</div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
        <input aria-label="Label name" type="text" placeholder="Label name" value={name} onChange={e => setName(e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 8, border: "1px solid #e6e9ef" }} />
        <input aria-label="Choose color" type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: 44, height: 36, borderRadius: 8, padding: 3, border: "1px solid #e6e9ef", background: "white" }} />
        <button onClick={handleAdd} className="btn" style={{ borderRadius: 8 }}>Add</button>
      </div>

      {error && <div style={{ color: "#dc2626", marginTop: 8 }}>{error}</div>}

      <div style={{ marginTop: 12 }} className="label-group">
        {labels.map(l => (
          <div key={`group-${l.id}`} style={{ marginBottom: 10 }}>
            <h4 style={{ margin: "0 0 6px 0", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 12, height: 12, background: l.color, display: "inline-block", borderRadius: 4 }} />
              {l.name}
            </h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {(grouped[l.name] || []).slice(0, 20).map(a => (
                <li key={a.id} style={{ marginBottom: 6 }}>
                  <button className="link-like" onClick={() => onScrollToAnnotation && onScrollToAnnotation(a.id)} style={{ background: "none", border: "none", padding: 0, color: "#2563eb", cursor: "pointer", textAlign: "left" }}>
                    {a.text.length > 80 ? a.text.slice(0, 77) + "..." : a.text}
                  </button>
                </li>
              ))}
              {(grouped[l.name] || []).length === 0 && <li style={{ color: "#8892a6" }}>— none —</li>}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}
