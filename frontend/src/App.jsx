// import React from "react";
// import DocumentUpload from "./components/DocumentUpload";

// export default function App() {
//   return (
//     <div className="app">
//       <header className="app-header">
//         <h1>Document Annotation Tool</h1>
//         <div className="app-meta">Frontend — responsive & labels</div>
//       </header>

//       <div className="app-body">
//         <div className="app-container">
//           <DocumentUpload />
//         </div>
//       </div>

//       <footer className="app-footer">Course project — frontend demo</footer>
//     </div>
//   );
// }

import { useState } from "react";
import { useAuth } from "./context/AuthContext";

import Login from "./pages/Login";
import Register from "./pages/Register";
import DocumentUpload from "./components/DocumentUpload";

function App() {
  const { isAuthenticated, logout, user } = useAuth();
  const [mode, setMode] = useState("login"); // login | register

  // NOT authenticated → Login / Register
  if (!isAuthenticated) {
    if (mode === "register") {
      return <Register onGoToLogin={() => setMode("login")} />;
    }
    return <Login onGoToRegister={() => setMode("register")} />;
  }

  // Authenticated → FULL LAYOUT
  return (
    <div className="app">
      <header className="app-header">
        <h1>Document Annotation Tool</h1>
        <div className="app-meta">
          Logged in as <strong>{user?.username}</strong>
          <button
            className="btn btn-ghost"
            onClick={logout}
            style={{ marginLeft: 12 }}
          >
            Logout
          </button>
        </div>
      </header>

      <div className="app-body">
        <div className="app-container">
          <DocumentUpload />
        </div>
      </div>

      <footer className="app-footer">
        Course project — frontend demo
      </footer>
    </div>
  );
}

export default App;
