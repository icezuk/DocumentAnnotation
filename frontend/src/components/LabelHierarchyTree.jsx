import React, { useState } from "react";

/**
 * Displays a single label node with children in a tree structure
 * Props:
 *   - label: { id, name, color, children: [] }
 *   - level: number (for indentation)
 *   - onAddChild: fn(parentLabel) - callback when + is clicked
 *   - userId: number - current user ID
 */
function LabelNode({ label, level = 0, onAddChild, onEditLabel, onDeleteLabel }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = label.children && label.children.length > 0;
  const indent = level * 24; // 24px per level

  return (
    <div key={label.id}>
      {/* Label row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          marginLeft: `${indent}px`,
          marginBottom: 4,
          borderRadius: 6,
          background: "#f8fafc",
          border: "1px solid #e2e8f0"
        }}
      >
        {/* Expand/Collapse Arrow */}
        {hasChildren && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              display: "flex",
              alignItems: "center",
              color: "#64748b",
              fontSize: 14,
              width: 20,
              height: 20
            }}
            title={isExpanded ? "Collapse children" : "Expand children"}
          >
            {isExpanded ? "▼" : "▶"}
          </button>
        )}
        {!hasChildren && <div style={{ width: 20 }} />}

        {/* Color indicator */}
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: 2,
            background: label.color || "#94a3b8",
            border: "1px solid rgba(0,0,0,0.1)"
          }}
        />

        {/* Label name */}
        <div style={{ flex: 1, fontWeight: 500, color: "#1e293b", fontSize: 14 }}>
          {label.name}
        </div>

        {/* Edit */}
        <button
          onClick={() => onEditLabel && onEditLabel(label)}
          title="Edit label"
          style={{
            background: "none",
            border: "1px solid #cbd5e1",
            borderRadius: 4,
            cursor: "pointer",
            width: 28,
            height: 28
          }}
        >
          ✏️
        </button>

        {/* Delete */}
        <button
          onClick={() => {
            if (confirm(`Delete "${label.name}" and all its children?`)) {
              onDeleteLabel && onDeleteLabel(label);
            }
          }}
          title="Delete label"
          style={{
            background: "none",
            border: "1px solid #fecaca",
            borderRadius: 4,
            cursor: "pointer",
            width: 28,
            height: 28,
            color: "#dc2626"
          }}
        >
          🗑️
        </button>

        {/* Add child button */}
        <button
          onClick={() => onAddChild(label)}
          style={{
            background: "none",
            border: "1px solid #cbd5e1",
            borderRadius: 4,
            cursor: "pointer",
            padding: "4px 8px",
            color: "#475569",
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
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
      </div>

      {/* Children (if expanded) */}
      {hasChildren && isExpanded && (
        <div>
          {label.children.map((child) => (
            <LabelNode
              key={child.id}
              label={child}
              level={level + 1}
              onAddChild={onAddChild}
              userId={userId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * LabelHierarchyTree Component
 * Displays all labels in a hierarchical tree structure
 * Props:
 *   - labelHierarchy: [{ id, name, color, children: [] }] - root labels with tree structure
 *   - onAddChild: fn(parentLabel) - callback when + is clicked
 *   - userId: number - current user ID
 *   - isLoading: boolean - show loading state
 */
export default function LabelHierarchyTree({
  labelHierarchy = [],
  onAddChild,
  onEditLabel,
  onDeleteLabel,
  isLoading = false
}) {
  if (isLoading) {
    return (
      <div style={{ padding: 16, color: "#64748b", fontSize: 14 }}>
        Loading label hierarchy...
      </div>
    );
  }

  if (!labelHierarchy || labelHierarchy.length === 0) {
    return (
      <div style={{ padding: 16, color: "#64748b", fontSize: 14 }}>
        No labels yet. Create one from the sidebar to get started.
      </div>
    );
  }

  return (
    <div style={{ padding: 12 }}>
      <h4 style={{ margin: "0 0 12px 0", color: "#334155", fontSize: 14 }}>
        Label Hierarchy
      </h4>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {labelHierarchy.map((label) => (
          <LabelNode
            key={label.id}
            label={label}
            level={0}
            onAddChild={onAddChild}
            onEditLabel={onEditLabel}
            onDeleteLabel={onDeleteLabel}
          />
        ))}
      </div>
    </div>
  );
}
