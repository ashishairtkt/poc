import React, { createContext, useCallback, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
    loginThunk,
    signupThunk,
    logoutThunk,
    restoreSessionThunk,
    loginWithGoogleThunk,
} from "../redux/reducers/authSlice";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const dispatch = useDispatch();
    const { isAuthenticated, isLoading, isRestoringSession, user, token, tokenExpiry, error } =
        useSelector((state) => state.auth);

    // ── Restore session on mount (handles page refresh) ───────────────────
    useEffect(() => {
        dispatch(restoreSessionThunk());
    }, [dispatch]);

    // ── Auth actions ──────────────────────────────────────────────────────
    const login = useCallback(
        (credentials) => dispatch(loginThunk(credentials)),
        [dispatch]
    );

    const signup = useCallback(
        (data) => dispatch(signupThunk(data)),
        [dispatch]
    );

    const logout = useCallback(
        () => dispatch(logoutThunk()),
        [dispatch]
    );

    const loginWithGoogle = useCallback(
        (credential) => dispatch(loginWithGoogleThunk(credential)),
        [dispatch]
    );

    // ── Memoized context value (avoids unnecessary re-renders) ────────────
    const value = useMemo(
        () => ({
            isAuthenticated,
            isLoading,
            isRestoringSession,
            user,
            token,
            tokenExpiry,
            error,
            login,
            signup,
            logout,
            loginWithGoogle,
        }),
        [
            isAuthenticated,
            isLoading,
            isRestoringSession,
            user,
            token,
            tokenExpiry,
            error,
            login,
            signup,
            logout,
            loginWithGoogle,
        ]
    );

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
