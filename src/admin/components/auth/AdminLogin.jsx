import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import { getApiErrorMessage } from "../../../services/api";
import { isAdminUser } from "../../../utils/admin";
import "../../admin.css";

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || "/admin/dashboard";

  // Already signed in as an admin -> straight to the dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated && isAdminUser(user)) {
      navigate(redirectTo, { replace: true });
    }
  }, [isLoading, isAuthenticated, user, navigate, redirectTo]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const loggedInUser = await login(email, password);

      if (!isAdminUser(loggedInUser)) {
        try {
          await logout();
        } catch {
          /* ignore - the session is cleared locally either way */
        }
        setError("This account does not have admin access.");
        return;
      }

      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-root">
      <div className="login-page">
        <div className="login-card">
          <h1>Admin Login</h1>
          <p>Sign in to access the Admin Dashboard</p>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <label>Email</label>
            <input
              type="email"
              placeholder="Enter admin email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={submitting}
            />

            <label>Password</label>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={submitting}
            />

            <button type="submit" disabled={submitting}>
              {submitting ? "Signing in..." : "Login"}
            </button>
          </form>

          <p style={{ marginTop: 20, marginBottom: 0, fontSize: 14 }}>
            Not an admin?{" "}
            <Link to="/login" style={{ color: "#f97316", fontWeight: 600 }}>
              Student login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;
