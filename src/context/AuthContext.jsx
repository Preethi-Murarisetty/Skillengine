import React, {
  createContext,
  useContext,
  useState,
  useEffect,
} from "react";

import {
  loginUser,
  registerUser,
  logoutUser,
  getCurrentUser,
} from "../services/api";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // ============================================================
  // RESTORE USER FROM LOCAL STORAGE
  // ============================================================
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("authUser");

      if (savedUser) {
        return JSON.parse(savedUser);
      }

      return null;
    } catch (error) {
      console.error("❌ Failed to restore auth user:", error);
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(true);

  // ============================================================
  // RESTORE AUTHENTICATION AFTER REFRESH
  // ============================================================
  useEffect(() => {
    const restoreAuthentication = async () => {
      console.log("🔄 Restoring authentication...");

      const token =
        localStorage.getItem("authToken") ||
        localStorage.getItem("access_token");

      // --------------------------------------------------------
      // No token
      // --------------------------------------------------------
      if (!token) {
        console.log("ℹ️ No authentication token found");

        setUser(null);
        setIsLoading(false);

        return;
      }

      // --------------------------------------------------------
      // Restore saved user immediately
      // --------------------------------------------------------
      const savedUser = localStorage.getItem("authUser");

      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);

          console.log("👤 Restored saved user:", parsedUser);

          setUser(parsedUser);
        } catch (error) {
          console.error(
            "❌ Invalid saved auth user:",
            error
          );
        }
      }

      // --------------------------------------------------------
      // Verify token with backend
      // --------------------------------------------------------
      try {
        console.log("🔐 Verifying authentication...");

        const currentUser = await getCurrentUser();

        if (currentUser) {
          console.log(
            "✅ Authentication verified:",
            currentUser
          );

          setUser(currentUser);

          localStorage.setItem(
            "authUser",
            JSON.stringify(currentUser)
          );
        }
      } catch (error) {
        console.error(
          "⚠️ Failed to verify current user:",
          error
        );

        /*
         * IMPORTANT:
         *
         * If authUser already exists, don't immediately
         * logout the user just because current-user API
         * temporarily fails.
         */
        if (!savedUser) {
          console.log(
            "❌ No saved user available. Clearing session."
          );

          localStorage.removeItem("authToken");
          localStorage.removeItem("access_token");
          localStorage.removeItem("token");
          localStorage.removeItem("authUser");

          setUser(null);
        } else {
          console.log(
            "ℹ️ Keeping saved user because session exists."
          );
        }
      } finally {
        setIsLoading(false);

        console.log(
          "✅ Authentication restore completed."
        );
      }
    };

    restoreAuthentication();
  }, []);

  // ============================================================
  // LOGIN
  // ============================================================
  const login = async (email, password) => {
    console.log("🔐 LOGIN START");
    console.log("📧 Email:", email);

    try {
      // --------------------------------------------------------
      // Call login API
      // --------------------------------------------------------
      const response = await loginUser(
        email,
        password
      );

      console.log(
        "📥 LOGIN API RESPONSE:",
        response
      );

      // --------------------------------------------------------
      // Extract user + token
      // --------------------------------------------------------
      const loggedInUser = response?.user || null;
      const token = response?.token || null;

      console.log(
        "👤 Logged in user:",
        loggedInUser
      );

      console.log(
        "🔑 Token received:",
        !!token
      );

      // --------------------------------------------------------
      // Token validation
      // --------------------------------------------------------
      if (!token) {
        console.error(
          "❌ Login succeeded but token was not returned."
        );

        throw new Error(
          "Login succeeded, but the API did not return an access token."
        );
      }

      // --------------------------------------------------------
      // Save token
      // --------------------------------------------------------
      localStorage.setItem(
        "authToken",
        token
      );

      /*
       * Also save access_token for compatibility with
       * existing authentication code.
       */
      localStorage.setItem(
        "access_token",
        token
      );

      console.log(
        "✅ Authentication token saved."
      );

      // --------------------------------------------------------
      // Get user details
      // --------------------------------------------------------
      let currentUser = loggedInUser;

      if (!currentUser) {
        console.log(
          "ℹ️ User not returned by login API."
        );

        console.log(
          "🔄 Fetching current user..."
        );

        currentUser = await getCurrentUser();
      }

      // --------------------------------------------------------
      // User validation
      // --------------------------------------------------------
      if (!currentUser) {
        console.error(
          "❌ User information could not be loaded."
        );

        throw new Error(
          "Login succeeded, but user information could not be loaded."
        );
      }

      // --------------------------------------------------------
      // Save user
      // --------------------------------------------------------
      localStorage.setItem(
        "authUser",
        JSON.stringify(currentUser)
      );

      // --------------------------------------------------------
      // Update React state
      // --------------------------------------------------------
      setUser(currentUser);

      console.log(
        "✅ LOGIN SUCCESS"
      );

      console.log(
        "👤 USER:",
        currentUser
      );

      console.log(
        "➡️ Login function returning user to Login.jsx"
      );

      // IMPORTANT:
      // Login.jsx handles navigation.
      // AuthContext should NOT navigate anywhere.
      return currentUser;

    } catch (error) {
      console.error(
        "❌ LOGIN FAILED:",
        error
      );

      throw error;
    }
  };

  // ============================================================
  // REGISTER
  // ============================================================
  const register = async (userData) => {
    console.log(
      "📝 REGISTER START"
    );

    try {
      const response = await registerUser(
        userData
      );

      console.log(
        "✅ REGISTER RESPONSE:",
        response
      );

      const registeredUser =
        response?.user || null;

      return registeredUser;
    } catch (error) {
      console.error(
        "❌ REGISTER FAILED:",
        error
      );

      throw error;
    }
  };

  // ============================================================
  // LOGOUT
  // ============================================================
  const logout = async () => {
    console.log(
      "🚪 LOGOUT START"
    );

    try {
      await logoutUser();

      console.log(
        "✅ Logout API completed."
      );
    } catch (error) {
      console.error(
        "⚠️ Logout API error:",
        error
      );
    }

    // ----------------------------------------------------------
    // Clear authentication data
    // ----------------------------------------------------------
    localStorage.removeItem("authUser");
    localStorage.removeItem("authToken");
    localStorage.removeItem("access_token");
    localStorage.removeItem("token");

    // ----------------------------------------------------------
    // Clear React state
    // ----------------------------------------------------------
    setUser(null);

    console.log(
      "✅ User logged out successfully."
    );
  };

  // ============================================================
  // CONTEXT VALUE
  // ============================================================
  const value = {
    user,

    isAuthenticated: !!user,

    isLoading,

    login,

    register,

    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// ============================================================
// useAuth HOOK
// ============================================================
export const useAuth = () => {
  const context = useContext(
    AuthContext
  );

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
};