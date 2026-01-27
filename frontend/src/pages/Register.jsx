import { useState } from "react";
import { registerUser, loginUser } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Register({ onGoToLogin }) {
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setOk("");

    try {
      await registerUser(username, password);

      // auto-login after registration
      const result = await loginUser(username, password);
      login(result.token);

      setOk("Registered successfully!");
    } catch (err) {
      setError(err.message || "Registration failed");
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="main">
          <h2 className="auth-title">Create account</h2>
          <div className="auth-subtitle">
            Register to start annotating documents
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
            <div className="muted" style={{ fontSize: 12 }}>
                Password should be at least 6 characters.
            </div>
            {password.length > 0 && password.length < 6 && (
            <div style={{ fontSize: 12, color: "#dc2626" }}>
                Password too short
            </div>
            )}

            {error && <div className="muted" style={{ color: "red" }}>{error}</div>}

            <div className="auth-actions">
              <button type="submit" className="btn btn-primary">
                Register
              </button>

              <div className="auth-switch">
                Already have an account?{" "}
                <button type="button" onClick={onGoToLogin}>
                  Login
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
