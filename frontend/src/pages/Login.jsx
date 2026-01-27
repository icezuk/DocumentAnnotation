import { useState } from "react";
import { loginUser } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Login({onGoToRegister}) {
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      const result = await loginUser(username, password);
      login(result.token);
    } catch (err) {
      setError("Invalid username or password");
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="main">
          <h2 className="auth-title">Login</h2>
          <div className="auth-subtitle">
            Sign in to continue annotating documents
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && <div className="muted" style={{ color: "red" }}>{error}</div>}

            <div className="auth-actions">
              <button type="submit" className="btn btn-primary">
                Login
              </button>

              <div className="auth-switch">
                No account?{" "}
                <button type="button" onClick={onGoToRegister}>
                  Register
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
