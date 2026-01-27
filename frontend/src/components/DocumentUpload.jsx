import React, { useRef, useState, useEffect, useMemo } from "react";
import DocumentViewer from "./DocumentViewer";
import Sidebar from "./Sidebar";
import CreateChildLabelModal from "./CreateChildLabelModal";
import { uploadDocument, fetchDocumentContent } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { fetchMyDocuments } from "../services/api";
import { fetchLabelHierarchy, createChildLabel, createLabel } from "../services/labelHierarchyAPI";
import { fetchAnnotationsForDocument, createAnnotation } from "../services/annotationsAPI";

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
  const { token, user } = useAuth();
  const userId = user?.id;

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

  // Track which documents have had their content loaded to prevent duplicate fetches
  const loadedDocumentsRef = useRef(new Set());
  // Track the previous documents length to detect when documents are loaded
  const prevDocumentsLengthRef = useRef(0);


  useEffect(() => {
    if (!token || !userId) return;

    (async () => {
      try {
        setIsHierarchyLoading(true);
        const hierarchy = await fetchLabelHierarchy(token); // TODO: Get actual user ID from auth context
        setLabelHierarchy(hierarchy);
      } catch (err) {
        console.error("Error loading label hierarchy:", err);
      } finally {
        setIsHierarchyLoading(false);
      }
    })();
  }, [token, userId]);

  useEffect(() => {
    if (!token) return;

    console.log("[DOCS] Fetching my documents");
    (async () => {
      try {
        const docs = await fetchMyDocuments(token);
        console.log("[DOCS] Received", docs.length, "documents from server");
        // docs come from the DB and are already filtered by user_id from the backend
        const mapped = docs.map(d => ({
          id: d.id,
          title: d.title,
          text: "",          // we load it on 'open'
          annotations: [],   // ALWAYS start with empty array
        }));
        
        // Validate all documents have proper annotations array
        mapped.forEach((doc, idx) => {
          if (!Array.isArray(doc.annotations)) {
            console.warn("[DOCS] Document", idx, "has invalid annotations! Fixing...");
            doc.annotations = [];
          }
        });
        
        console.log("[DOCS] Setting documents in state");
        setDocuments(mapped);

        // if there are documents - open the first one (not mandatory to have it)
        if (mapped.length && !activeDocId) {
          console.log("[DOCS] Setting activeDocId to first document:", mapped[0].id);
          setActiveDocId(mapped[0].id);
        }
      } catch (e) {
        console.error("[DOCS] Error:", e);
      }
    })();
  }, [token]);

  useEffect(() => {
    if (!token || !activeDocId) return;

    // Trigger loading if documents list just populated and activeDocId is set
    if (documents.length > prevDocumentsLengthRef.current) {
      console.log("[TEXT] Documents list updated, checking for text");
      prevDocumentsLengthRef.current = documents.length;
    }

    const doc = documents.find(d => d.id === activeDocId);
    if (!doc) {
      console.log("[TEXT] Document not found in list");
      return;
    }

    // If we already have text, don't fetch again
    if (doc.text) {
      console.log("[TEXT] Document already has text");
      return;
    }

    // If we're already fetching this doc, don't fetch again
    if (loadedDocumentsRef.current.has(activeDocId)) {
      console.log("[TEXT] Document already being fetched");
      return;
    }

    console.log("[TEXT] Starting to fetch");
    loadedDocumentsRef.current.add(activeDocId);

    let isMounted = true;

    (async () => {
      try {
        console.log("[TEXT] Fetching content for doc:", activeDocId);
        const contentResult = await fetchDocumentContent(activeDocId, token);
        console.log("[TEXT] Received", contentResult?.content?.length, "characters");
        // Only update if component is still mounted
        if (isMounted) {
          console.log("[TEXT] Updating document state");
          setDocuments(prev =>
            prev.map(d => d.id === activeDocId ? { ...d, text: contentResult.content } : d)
          );
        } else {
          console.log("[TEXT] Component unmounted, skipping update");
        }
      } catch (e) {
        console.error("[TEXT] Error loading:", e);
        // Remove from loaded set on error so we can retry
        loadedDocumentsRef.current.delete(activeDocId);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [activeDocId, token]);

  // Load annotations for the active document from the database
  useEffect(() => {
    if (!token || !activeDocId || !userId) {
      console.log("[ANN] Skipping - missing token, activeDocId, or userId");
      return;
    }

    // Check if document exists
    const doc = documents.find(d => d.id === activeDocId);
    if (!doc) {
      console.log("[ANN] Document not found");
      return;
    }

    console.log("[ANN] Starting annotation load for doc:", activeDocId);
    let isMounted = true;

    (async () => {
      try {
        console.log("[ANN] Fetching annotations for doc:", activeDocId, "userId:", userId);
        let dbAnnotations = await fetchAnnotationsForDocument(activeDocId, userId);
        
        // Defensive programming: ensure dbAnnotations is always a valid array
        if (!Array.isArray(dbAnnotations)) {
          console.warn("[ANN] ERROR: dbAnnotations is not an array! Got type:", typeof dbAnnotations);
          console.warn("[ANN] dbAnnotations value:", dbAnnotations);
          dbAnnotations = [];
        }
        
        // Ensure no undefined/null values in array
        dbAnnotations = dbAnnotations.filter(a => a !== null && a !== undefined);
        
        console.log("[ANN] Got", dbAnnotations.length, "annotations from database");
        if (dbAnnotations.length > 0) {
          console.log("[ANN] Annotations:", JSON.stringify(dbAnnotations));
        } else {
          console.log("[ANN] No annotations found - result is EMPTY ARRAY (0 annotations)");
        }
        
        if (isMounted) {
          console.log("[ANN] Updating document state with", dbAnnotations.length, "annotations");
          setDocuments(prev => {
            const updated = prev.map(d => {
              if (d.id === activeDocId) {
                const newDoc = { ...d, annotations: dbAnnotations };
                if (!Array.isArray(newDoc.annotations)) {
                  console.error("[ANN] CRITICAL ERROR: annotations is not an array after setting!");
                  newDoc.annotations = [];
                }
                return newDoc;
              }
              return d;
            });
            
            const newDoc = updated.find(d => d.id === activeDocId);
            console.log("[ANN] After update - doc", activeDocId, "has", newDoc?.text?.length || 0, "chars and", newDoc?.annotations?.length, "annotations");
            return updated;
          });
        }
      } catch (err) {
        console.error("[ANN] Error loading annotations:", err);
        if (isMounted) {
          console.log("[ANN] Setting annotations to empty array due to error");
          setDocuments(prev =>
            prev.map(d => d.id === activeDocId ? { ...d, annotations: [] } : d)
          );
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [activeDocId, token, userId]);

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
  async function handleAddAnnotation(a) {
    // a = { id, start, end, text, label, color } or { __reset: true }
    if (!activeDocId) return;
    
    // Handle reset action (clear all annotations)
    if (a && a.__reset) {
      setDocuments(prev => prev.map(doc => 
        doc.id === activeDocId ? { ...doc, annotations: [] } : doc
      ));
      return;
    }

    // Check for overlap
    const activeDoc = documents.find(d => d.id === activeDocId);
    if (activeDoc) {
      const overlap = activeDoc.annotations.some(an => !(a.end <= an.start || a.start >= an.end));
      if (overlap) {
        alert("This selection overlaps an existing annotation. Please select a non-overlapping range.");
        return;
      }
    }

    try {
      // Find the label_id by matching label name with the hierarchy
      let labelId = null;
      function findLabelId(labelNode, labelName) {
        if (labelNode.name === labelName) return labelNode.id;
        if (labelNode.children) {
          for (const child of labelNode.children) {
            const found = findLabelId(child, labelName);
            if (found) return found;
          }
        }
        return null;
      }

      for (const label of labelHierarchy) {
        labelId = findLabelId(label, a.label);
        if (labelId) break;
      }

      if (!labelId) {
        console.error("Label not found:", a.label);
        alert("Could not find label ID for annotation");
        return;
      }

      // Save annotation to database
      const dbAnnotation = await createAnnotation(
        activeDocId,
        labelId,
        a.start,
        a.end,
        a.text,
        userId
      );

      // Add to local state with the database ID
      const annotationWithDbId = {
        id: dbAnnotation.id,
        start: a.start,
        end: a.end,
        text: a.text,
        label: a.label,
        color: a.color
      };

      setDocuments(prev => prev.map(doc => {
        if (doc.id !== activeDocId) return doc;
        const nextAnns = [...doc.annotations, annotationWithDbId].sort((x, y) => x.start - y.start);
        return { ...doc, annotations: nextAnns };
      }));
    } catch (err) {
      console.error("Error saving annotation:", err);
      alert(`Failed to save annotation: ${err.message}`);
    }
  }

  // add label to database
  async function handleAddLabel(l) {
    const color = l.color || getNextLabelColor();
    const name = l.name || l.id;
    
    try {
      // Check if label already exists in hierarchy
      if (labelHierarchy.some(root => labelExists(root, name.toLowerCase()))) {
        alert("Label with this name already exists.");
        return;
      }

      // Create label in database
      await createLabel({name, color}, token);

      // Refresh hierarchy
      const hierarchy = await fetchLabelHierarchy(token);
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

  // close a document tab (deletes from DB)
  async function closeDocument(docId) {
    if (!confirm("Delete this document from the database? This cannot be undone.")) return;
    
    try {
      console.log("[DOCS] Deleting document:", docId);
      const response = await fetch(`http://localhost:3000/api/documents/${docId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        alert("Failed to delete document from database");
        return;
      }
      
      console.log("[DOCS] Document deleted from DB");
      // Remove from UI
      setDocuments(prev => {
        const filtered = prev.filter(d => d.id !== docId);
        if (activeDocId === docId) {
          setActiveDocId(filtered.length > 0 ? filtered[0].id : null);
        }
        return filtered;
      });
      // Clear from loaded documents set
      loadedDocumentsRef.current.delete(docId);
    } catch (err) {
      console.error("[DOCS] Error deleting document:", err);
      alert("Error deleting document");
    }
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

      
      await createChildLabel(
        selectedParentLabel.id,
        {name: childData.name, color: childData.color},
        token
      );

      // Refresh hierarchy
      const hierarchy = await fetchLabelHierarchy(token);
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
  
  // Debug: Log activeDoc state - VERBOSE
  useEffect(() => {
    console.log("[RENDER] activeDoc check");
    console.log("[RENDER]   activeDocId:", activeDocId);
    console.log("[RENDER]   documents.length:", documents.length);
    console.log("[RENDER]   activeDoc exists:", !!activeDoc);
    if (activeDoc) {
      console.log("[RENDER]   activeDoc.text length:", activeDoc.text?.length || 0);
      console.log("[RENDER]   activeDoc.annotations type:", typeof activeDoc.annotations);
      console.log("[RENDER]   activeDoc.annotations is array:", Array.isArray(activeDoc.annotations));
      console.log("[RENDER]   activeDoc.annotations length:", activeDoc.annotations?.length || "???");
      console.log("[RENDER]   activeDoc.annotations value:", JSON.stringify(activeDoc.annotations));
      console.log("[RENDER]   Full activeDoc:", JSON.stringify({id: activeDoc.id, title: activeDoc.title, textLen: activeDoc.text?.length, annotationCount: activeDoc.annotations?.length}));
    }
  }, [activeDoc]);

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
