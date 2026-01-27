import React, { useRef, useState, useEffect, useMemo } from "react";
import DocumentViewer from "./DocumentViewer";
import Sidebar from "./Sidebar";
import CreateChildLabelModal from "./CreateChildLabelModal";
import { uploadDocument, fetchDocumentContent } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { fetchMyDocuments } from "../services/api";
import { fetchLabelHierarchy, createChildLabel, createLabel } from "../services/labelHierarchyAPI";

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
  const { token } = useAuth();

  // NOTE: labels are now managed via labelHierarchy (database labels)
  // We keep this for backward compatibility with the Sidebar's grouped annotations logic
  const [labels, setLabels] = useState([]);

  // documents: array of { id, title, text, annotations: [{id,start,end,text,label,color}] }
  const [documents, setDocuments] = useState([]);
  const [activeDocId, setActiveDocId] = useState(null);

  // Label hierarchy state
  const [labelHierarchy, setLabelHierarchy] = useState([]);
  const [isHierarchyLoading, setIsHierarchyLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedParentLabel, setSelectedParentLabel] = useState(null);
  const [isCreatingChild, setIsCreatingChild] = useState(false);


  useEffect(() => {
    if (!token) return;

    (async () => {
      try {
        setIsHierarchyLoading(true);
        const hierarchy = await fetchLabelHierarchy(1); // TODO: Get actual user ID from auth context
        setLabelHierarchy(hierarchy);
      } catch (err) {
        console.error("Error loading label hierarchy:", err);
      } finally {
        setIsHierarchyLoading(false);
      }
    })();
  }, [token]);

  useEffect(() => {
    if (!token) return;

    (async () => {
      try {
        const docs = await fetchMyDocuments(token);
        // docs come from the DB and are already filtered by user_id from the backend
        const mapped = docs.map(d => ({
          id: d.id,
          title: d.title,
          text: "",          // we load it on 'open'
          annotations: [],   // empty for now (haven't connected annotations to the DB yet)
        }));
        setDocuments(mapped);

        // if there are documents - open the first one (not mandatory to have it)
        if (mapped.length && !activeDocId) {
          setActiveDocId(mapped[0].id);
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, [token]);

  useEffect(() => {
    if (!token || !activeDocId) return;

    const doc = documents.find(d => d.id === activeDocId);
    if (!doc) return;

    // if we already have text we don't 'draw' again
    if (doc.text) return;

    (async () => {
      try {
        const contentResult = await fetchDocumentContent(activeDocId, token);
        setDocuments(prev =>
          prev.map(d => d.id === activeDocId ? { ...d, text: contentResult.content } : d)
        );
      } catch (e) {
        console.error(e);
      }
    })();
  }, [activeDocId, token, documents]);

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
      const uploadResult = await uploadDocument(f, token);

      // get content from backend
      const contentResult = await fetchDocumentContent(uploadResult.id, token);

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
      alert(`Failed to upload document: ${err.message}`);
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

  // add label to database
  async function handleAddLabel(l) {
    const color = l.color || getNextLabelColor();
    const name = l.name || l.id;
    const userId = 1; // TODO: Get from auth context
    
    try {
      // Check if label already exists in hierarchy
      if (labelHierarchy.some(root => labelExists(root, name.toLowerCase()))) {
        alert("Label with this name already exists.");
        return;
      }

      // Create label in database
      await createLabel(name, color, userId);

      // Refresh hierarchy
      const hierarchy = await fetchLabelHierarchy(userId);
      setLabelHierarchy(hierarchy);
    } catch (err) {
      console.error("Error adding label:", err);
      alert(`Failed to create label: ${err.message}`);
    }
  }

  // Helper to check if label exists in hierarchy tree
  function labelExists(labelNode, nameToFind) {
    if (labelNode.name.toLowerCase() === nameToFind) return true;
    if (labelNode.children) {
      return labelNode.children.some(child => labelExists(child, nameToFind));
    }
    return false;
  }

  // close a document tab
  function closeDocument(docId) {
    if (!confirm("Close this document? Your annotations for this file will be removed from workspace (they won't be exported).")) return;
    setDocuments(prev => {
      const filtered = prev.filter(d => d.id !== docId);
      if (activeDocId === docId) {
        setActiveDocId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  }

  // Handle adding child label
  function handleAddChildClick(parentLabel) {
    setSelectedParentLabel(parentLabel);
    setIsModalOpen(true);
  }

  // Handle creating child label
  async function handleCreateChildLabel(childData) {
    if (!selectedParentLabel) return;

    try {
      setIsCreatingChild(true);
      const userId = 1; // TODO: Get actual user ID from auth context
      
      await createChildLabel(
        selectedParentLabel.id,
        childData.name,
        childData.color,
        userId
      );

      // Refresh hierarchy
      const hierarchy = await fetchLabelHierarchy(userId);
      setLabelHierarchy(hierarchy);

      // Close modal
      setIsModalOpen(false);
      setSelectedParentLabel(null);
    } catch (err) {
      console.error("Error creating child label:", err);
      alert(`Error: ${err.message}`);
    } finally {
      setIsCreatingChild(false);
    }
  }

  // Helper to flatten hierarchical labels for the Sidebar's grouped annotations logic
  // Memoized to prevent unnecessary re-renders of Sidebar
  const flattenedLabels = useMemo(() => {
    const flattened = [];
    function flatten(labelNode) {
      flattened.push({ id: labelNode.id, name: labelNode.name, color: labelNode.color });
      if (labelNode.children && labelNode.children.length > 0) {
        labelNode.children.forEach(child => flatten(child));
      }
    }
    labelHierarchy.forEach(label => flatten(label));
    return flattened;
  }, [labelHierarchy]);

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
              labels={labelHierarchy}
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
          labels={flattenedLabels}
          annotations={activeDoc ? activeDoc.annotations : []}
          allAnnotations={documents.flatMap(d => d.annotations)}
          suggestedColor={getNextLabelColor()}
          onAddLabel={handleAddLabel}
          onScrollToAnnotation={(id) => {
            const el = document.querySelector(`[data-annotation-id="${id}"]`);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
          labelHierarchy={labelHierarchy}
          onAddChild={handleAddChildClick}
          userId={1}
          isHierarchyLoading={isHierarchyLoading}
        />

        {/* Create Child Label Modal */}
        <CreateChildLabelModal
          isOpen={isModalOpen}
          parentLabel={selectedParentLabel}
          onSubmit={handleCreateChildLabel}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedParentLabel(null);
          }}
          suggestedColor={getNextLabelColor()}
          isLoading={isCreatingChild}
        />
      </div>
    </div>
  );

}
