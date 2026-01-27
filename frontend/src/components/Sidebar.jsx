import React, { useEffect, useState } from "react";

/*
Props:
  labels: [{id,name,color}]
  annotations: [{id,start,end,text,label,color}] - for active doc
  onAddLabel: fn({id,name,color})
  onScrollToAnnotation: fn(id)
  suggestedColor: string
  allAnnotations: array (optional) - across docs (for totals)
  labelHierarchy: array - hierarchical labels with children
  onAddChild: fn(parentLabel) - callback when + is clicked on a label
  userId: number - current user ID
  isHierarchyLoading: boolean - show loading state
*/
export default function Sidebar({
  labels = [],
  annotations = [],
  onAddLabel,
  onScrollToAnnotation,
  suggestedColor = "#2563eb",
  allAnnotations = [],
  labelHierarchy = [],
  onAddChild,
  userId,
  isHierarchyLoading = false
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(suggestedColor);
  const [error, setError] = useState("");
  const [expandedNodes, setExpandedNodes] = useState(new Set());

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

  // Toggle node expansion
  function toggleExpand(labelId) {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(labelId)) {
      newExpanded.delete(labelId);
    } else {
      newExpanded.add(labelId);
    }
    setExpandedNodes(newExpanded);
  }

  // Render a single label node in the hierarchy
  function renderLabelNode(label, level = 0) {
    const hasChildren = label.children && label.children.length > 0;
    const isExpanded = expandedNodes.has(label.id);
    const indent = level * 20; // 20px per level
    
    // Get annotations for this label
    const labelAnnotations = grouped[label.name] || [];

    return (
      <div key={label.id}>
        {/* Label row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 8px",
            marginLeft: `${indent}px`,
            marginBottom: 3,
            borderRadius: 6,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            fontSize: 13
          }}
        >
          {/* Expand/Collapse Arrow - for both children and annotations */}
          {(hasChildren || labelAnnotations.length > 0) && (
            <button
              onClick={() => toggleExpand(label.id)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                display: "flex",
                alignItems: "center",
                color: "#64748b",
                fontSize: 12,
                width: 16,
                height: 16,
                minWidth: 16
              }}
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? "▼" : "▶"}
            </button>
          )}
          {!hasChildren && labelAnnotations.length === 0 && <div style={{ width: 16 }} />}

          {/* Color indicator */}
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background: label.color || "#94a3b8",
              border: "1px solid rgba(0,0,0,0.1)",
              flexShrink: 0
            }}
          />

          {/* Label name and count */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 500, color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {label.name}
            </div>
            {labelAnnotations.length > 0 && (
              <div style={{ fontSize: 11, color: "#64748b" }}>
                {labelAnnotations.length} highlight{labelAnnotations.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* Add child button */}
          {onAddChild && (
            <button
              onClick={() => onAddChild(label)}
              style={{
                background: "none",
                border: "1px solid #cbd5e1",
                borderRadius: 3,
                cursor: "pointer",
                padding: "2px 6px",
                color: "#475569",
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 20,
                height: 20,
                flexShrink: 0,
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#e2e8f0";
                e.currentTarget.style.color = "#1e293b";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "none";
                e.currentTarget.style.color = "#475569";
              }}
              title={`Add child label to ${label.name}`}
            >
              +
            </button>
          )}
        </div>

        {/* Expanded content: children and annotations */}
        {isExpanded && (
          <div>
            {/* Child labels */}
            {hasChildren && (
              <div>
                {label.children.map((child) => renderLabelNode(child, level + 1))}
              </div>
            )}

            {/* Annotations for this label */}
            {labelAnnotations.length > 0 && (
              <div style={{ marginLeft: `${indent + 20}px`, marginBottom: 4 }}>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {labelAnnotations.slice(0, 10).map(a => (
                    <li key={a.id} style={{ marginBottom: 3 }}>
                      <button 
                        className="link-like" 
                        onClick={() => onScrollToAnnotation && onScrollToAnnotation(a.id)} 
                        style={{ 
                          background: "none", 
                          border: "none", 
                          padding: "2px 4px", 
                          color: "#2563eb", 
                          cursor: "pointer", 
                          textAlign: "left", 
                          fontSize: 11,
                          borderRadius: 3,
                          maxWidth: "100%",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          display: "block"
                        }}
                        title={a.text}
                      >
                        "{a.text.length > 50 ? a.text.slice(0, 47) + "..." : a.text}"
                      </button>
                    </li>
                  ))}
                  {labelAnnotations.length > 10 && (
                    <li style={{ marginTop: 3, color: "#64748b", fontSize: 11 }}>
                      +{labelAnnotations.length - 10} more...
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <aside className="sidebar" aria-label="Labels">
      <h3 style={{ margin: 0 }}>Labels</h3>

      {/* Add new label section */}
      <div style={{ marginTop: 12, paddingBottom: 12, borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ fontSize: 12, color: "#475569", marginBottom: 8 }}>Add new label</div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input 
            aria-label="Label name" 
            type="text" 
            placeholder="Label name" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleAdd();
              }
            }}
            style={{ flex: 1, padding: 6, borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13 }} 
          />
          <input 
            aria-label="Choose color" 
            type="color" 
            value={color} 
            onChange={e => setColor(e.target.value)} 
            style={{ width: 36, height: 32, borderRadius: 6, padding: 2, border: "1px solid #e2e8f0", background: "white", cursor: "pointer" }} 
          />
          <button onClick={handleAdd} className="btn" style={{ borderRadius: 6, padding: "6px 12px", fontSize: 13 }}>Add</button>
        </div>
        {error && <div style={{ color: "#dc2626", marginTop: 6, fontSize: 12 }}>{error}</div>}
      </div>

      {/* Unified Labels section - combines hierarchy, creation, and annotations */}
      <div style={{ marginTop: 12 }}>
        <h4 style={{ margin: "0 0 8px 0", fontSize: 12, color: "#475569" }}>Your Labels</h4>
        
        {isHierarchyLoading ? (
          <div style={{ padding: 8, color: "#64748b", fontSize: 12 }}>
            Loading labels...
          </div>
        ) : labelHierarchy && labelHierarchy.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {labelHierarchy.map((label) => renderLabelNode(label, 0))}
          </div>
        ) : (
          <div style={{ padding: 8, color: "#64748b", fontSize: 12 }}>
            No labels yet. Create one above!
          </div>
        )}
      </div>
    </aside>
  );
}
