import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "../firebase/firebaseConfig";
import Loader from "../components/common/Loader";
import { setTokenProvider } from "../services/api";

// Mock user data
const MOCK_USER = {
  uid: "root-user-001",
  email: "anup@security.com",
  displayName: "Root Administrator",
  getIdToken: async () => "mock-jwt-token-12345", // Mock JWT token
};

// Hardcoded credentials
const ROOT_CREDENTIALS = {
  email: "anup@security.com",
  password: "security123",
};

// 1. Create the Authentication Context
const AuthContext = createContext(null);

// 2. Create the AuthProvider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Determine if mock authentication should be used (e.g., based on environment variable)
  const useMockAuth = (import.meta.env?.VITE_USE_MOCK_AUTH === "true") || true; // Default to mock auth

  // Firebase auth state listener
  useEffect(() => {
    let unsubscribe;
    if (!useMockAuth) {
      unsubscribe = onAuthStateChanged(auth, (user) => {
        setUser(user);
        setLoading(false);
      });
    } else {
      // For testing: Clear any existing session and start fresh
      sessionStorage.removeItem("anup_security_portal_user");
      setUser(null);
      setLoading(false);
    }

    // Cleanup subscription on unmount
    return () => unsubscribe && unsubscribe();
  }, [useMockAuth]);

  // Firebase login
  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      if (useMockAuth) {
        // Simulate API call delay for mock auth
        await new Promise((resolve) => setTimeout(resolve, 1000));
        if (
          email === ROOT_CREDENTIALS.email &&
          password === ROOT_CREDENTIALS.password
        ) {
          setUser(MOCK_USER);
          sessionStorage.setItem("anup_security_portal_user", JSON.stringify(MOCK_USER));
          return { success: true };
        } else {
          throw new Error("Invalid credentials. Use admin@anup-security-portal.com / anup123");
        }
      } else {
        // Firebase auth
        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
        setUser(userCredential.user);
        return userCredential.user;
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [useMockAuth]);

  // Logout function
  const logout = useCallback(async () => {
    setLoading(true);
    try {
      if (useMockAuth) {
        setUser(null);
        sessionStorage.removeItem("anup_security_portal_user");
      } else {
        await signOut(auth);
        setUser(null);
      }
    } catch (err) {
      console.error("Logout Error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [useMockAuth]);

  // Use useMemo to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      login,
      logout,
    }),
    [user, loading, error, login, logout]
  );

  // Register token provider for api.js to unify auth headers
  useEffect(() => {
    setTokenProvider(async () => {
      try {
        return await (user?.getIdToken?.() || null);
      } catch {
        return null;
      }
    });
  }, [user]);

  // Render a loader while checking auth state
  if (loading) {
    return <Loader />;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// 3. Create the custom useAuth hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
