import { useState } from "react";
import DocumentViewer from "./DocumentViewer";

function DocumentUpload() {
  const [content, setContent] = useState("");

  function handleFileChange(event) {
    const selectedFile = event.target.files[0];

    if (selectedFile && selectedFile.type === "text/plain") {
      const reader = new FileReader();

      reader.onload = (e) => {
        setContent(e.target.result);
      };

      reader.readAsText(selectedFile);
    } else {
      setContent("");
    }
  }

  return (
    <div>
      <input type="file" onChange={handleFileChange} />

      {content && (
        <div style={{ marginTop: "20px" }}>
          <h3>Document</h3>
          <DocumentViewer text={content} />
        </div>
      )}
    </div>
  );
}

export default DocumentUpload;
