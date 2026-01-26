import React from "react";
import DocumentUpload from "./components/DocumentUpload";

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Document Annotation Tool</h1>
        <div className="app-meta">Frontend — responsive & labels</div>
      </header>

      <div className="app-body">
        <div className="app-container">
          <DocumentUpload />
        </div>
      </div>

      <footer className="app-footer">Course project — frontend demo</footer>
    </div>
  );
}
