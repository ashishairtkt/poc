import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { loginApi, signupApi, refreshTokenApi } from "../../services/authService";
import { jwtDecode } from "jwt-decode";

// ─── Storage helpers ──────────────────────────────────────────────────────────
const STORAGE_KEY = "auth_session";

const saveSession = (payload, remember) => {
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(STORAGE_KEY, JSON.stringify(payload));
};

const loadSession = () => {
  const raw =
    localStorage.getItem(STORAGE_KEY) ||
    sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const clearSession = () => {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
};

// ─── Async Thunks ─────────────────────────────────────────────────────────────

export const loginThunk = createAsyncThunk(
  "auth/login",
  async ({ email, password, remember = false }, { rejectWithValue }) => {
    try {
      const payload = await loginApi({ email, password });
      saveSession({ ...payload, remember }, remember);
      return { ...payload, remember };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const loginWithGoogleThunk = createAsyncThunk(
  "auth/loginWithGoogle",
  async (credential, { rejectWithValue }) => {
    try {
      // 1. Decode Google ID Token
      const decoded = jwtDecode(credential);

      const payload = {
        user: {
          id: decoded.sub,
          fullName: decoded.name,
          email: decoded.email,
          avatar: decoded.picture
        },
        token: credential, // Use ID token as Bearer token for now
        refreshToken: null, // Google OAuth ID token doesn't provide a refresh token directly here
        expiresAt: decoded.exp * 1000, // JWT exp is in seconds
      };

      saveSession({ ...payload, remember: true }, true);
      return { ...payload, remember: true };
    } catch (err) {
      return rejectWithValue("Google authentication failed. Please try again.");
    }
  }
);

export const signupThunk = createAsyncThunk(
  "auth/signup",
  async ({ fullName, email, password }, { rejectWithValue }) => {
    try {
      const payload = await signupApi({ fullName, email, password });
      // Auto-login after signup — store in sessionStorage by default
      saveSession({ ...payload, remember: false }, false);
      return { ...payload, remember: false };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const logoutThunk = createAsyncThunk("auth/logout", async () => {
  clearSession();
});

export const refreshTokenThunk = createAsyncThunk(
  "auth/refreshToken",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { refreshToken, remember } = getState().auth;
      const result = await refreshTokenApi(refreshToken);
      // Update storage with new token
      const session = loadSession();
      const updated = { ...session, ...result };
      saveSession(updated, remember);
      return result;
    } catch (err) {
      clearSession();
      return rejectWithValue(err.message);
    }
  }
);

export const restoreSessionThunk = createAsyncThunk(
  "auth/restoreSession",
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const session = loadSession();
      if (!session) return rejectWithValue("No session found.");

      const { user, token, refreshToken, expiresAt, remember } = session;

      // If token is expired, try to refresh it
      if (Date.now() >= expiresAt) {
        // Temporarily restore refreshToken so refreshTokenThunk can read it
        dispatch(authSlice.actions.setRefreshToken({ refreshToken, remember }));
        await dispatch(refreshTokenThunk()).unwrap();
        const updated = loadSession();
        return { ...updated, remember };
      }

      return { user, token, refreshToken, expiresAt, remember };
    } catch (err) {
      clearSession();
      return rejectWithValue(err.message);
    }
  }
);

// ─── Initial State ────────────────────────────────────────────────────────────
const initialState = {
  isAuthenticated: false,
  isLoading: false,
  isRestoringSession: true,
  user: null,
  token: null,
  refreshToken: null,
  tokenExpiry: null,
  remember: false,
  error: null,
};

// ─── Slice ────────────────────────────────────────────────────────────────────
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Internal: set refreshToken temporarily during restore
    setRefreshToken: (state, action) => {
      state.refreshToken = action.payload.refreshToken;
      state.remember = action.payload.remember;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // ── Login ──────────────────────────────────────────────────────────
    builder
      .addCase(loginThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.tokenExpiry = action.payload.expiresAt;
        state.remember = action.payload.remember;
        state.error = null;
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.error = action.payload;
      });

    // ── Login with Google ──────────────────────────────────────────────
    builder
      .addCase(loginWithGoogleThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginWithGoogleThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.tokenExpiry = action.payload.expiresAt;
        state.remember = action.payload.remember;
        state.error = null;
      })
      .addCase(loginWithGoogleThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });

    // ── Signup ─────────────────────────────────────────────────────────
    builder
      .addCase(signupThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signupThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.tokenExpiry = action.payload.expiresAt;
        state.remember = action.payload.remember;
        state.error = null;
      })
      .addCase(signupThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });

    // ── Logout ─────────────────────────────────────────────────────────
    builder.addCase(logoutThunk.fulfilled, (state) => {
      Object.assign(state, { ...initialState, isRestoringSession: false });
    });

    // ── Refresh Token ──────────────────────────────────────────────────
    builder
      .addCase(refreshTokenThunk.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.tokenExpiry = action.payload.expiresAt;
      })
      .addCase(refreshTokenThunk.rejected, (state) => {
        Object.assign(state, { ...initialState, isRestoringSession: false });
      });

    // ── Restore Session ────────────────────────────────────────────────
    builder
      .addCase(restoreSessionThunk.pending, (state) => {
        state.isRestoringSession = true;
      })
      .addCase(restoreSessionThunk.fulfilled, (state, action) => {
        state.isRestoringSession = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.tokenExpiry = action.payload.expiresAt;
        state.remember = action.payload.remember;
      })
      .addCase(restoreSessionThunk.rejected, (state) => {
        state.isRestoringSession = false;
        state.isAuthenticated = false;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
