import { useState } from "react";

function DocumentUpload() {
  const [file, setFile] = useState(null);

  function handleFileChange(event) {
    setFile(event.target.files[0]);
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!file) {
      alert("Please select a file first");
      return;
    }

    alert(`Selected file: ${file.name}`);
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="file" onChange={handleFileChange} />
      <br />
      <button type="submit">Upload</button>
    </form>
  );
}

export default DocumentUpload;
