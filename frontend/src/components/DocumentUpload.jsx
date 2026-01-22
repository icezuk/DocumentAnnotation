import { useState } from "react";

function DocumentUpload() {
  const [file, setFile] = useState(null);
  const [content, setContent] = useState("");

  function handleFileChange(event) {
    const selectedFile = event.target.files[0];
    setFile(selectedFile);

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
          <h3>Document content:</h3>
          <pre>{content}</pre>
        </div>
      )}
    </div>
  );
}

export default DocumentUpload;
