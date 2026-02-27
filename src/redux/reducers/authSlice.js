import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  loginApi,
  signupApi,
  refreshTokenApi,
  logoutApi,
} from "../../services/authService";
import { supabase } from "../../services/supabaseClient";
import {
  uploadAvatarAndGetUrl,
  upsertProfile,
  updateAuthMetadata,
} from "../../services/profileService";
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
  try {
    await logoutApi();
  } finally {
    clearSession();
  }
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
  async (_, { rejectWithValue }) => {
    try {
      const session = loadSession();
      if (!session) return rejectWithValue("No session found.");

      const { user, token, refreshToken, expiresAt, remember } = session;

      // Seed Supabase client session (and refresh if needed) when possible.
      if (token && refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: token,
          refresh_token: refreshToken,
        });
        if (error) throw error;
        if (data?.session) {
          const updated = {
            ...session,
            token: data.session.access_token,
            refreshToken: data.session.refresh_token,
            expiresAt: data.session.expires_at ? data.session.expires_at * 1000 : null,
          };
          saveSession(updated, remember);
          return {
            user: updated.user,
            token: updated.token,
            refreshToken: updated.refreshToken,
            expiresAt: updated.expiresAt,
            remember,
          };
        }
      }

      // No refreshToken (e.g. Google ID token) â€” fall back to stored session.
      if (expiresAt && Date.now() >= expiresAt) {
        clearSession();
        return rejectWithValue("Session expired. Please log in again.");
      }

      return { user, token, refreshToken, expiresAt, remember };
    } catch (err) {
      clearSession();
      return rejectWithValue(err.message);
    }
  }
);

// ─── Initial State ────────────────────────────────────────────────────────────
export const updateProfileThunk = createAsyncThunk(
  "auth/updateProfile",
  async ({ fullName, avatarFile }, { getState, rejectWithValue }) => {
    try {
      const state = getState().auth;
      const userId = state.user?.id;
      const email = state.user?.email;
      if (!userId || !email) throw new Error("No user session found.");

      let avatarUrl = state.user?.avatar ?? null;
      if (avatarFile) {
        avatarUrl = await uploadAvatarAndGetUrl({ userId, file: avatarFile });
      }

      const updatedUser = await upsertProfile({
        userId,
        email,
        fullName,
        avatarUrl,
      });

      try {
        await updateAuthMetadata({ fullName, avatarUrl });
      } catch {
        // Ignore metadata sync errors; DB remains source of truth for profile.
      }

      const session = loadSession();
      if (session) {
        saveSession({ ...session, user: updatedUser }, state.remember);
      }

      return updatedUser;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

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
        state.isLoading = false;
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

    // â”€â”€ Update Profile â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    builder
      .addCase(updateProfileThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateProfileThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = { ...state.user, ...action.payload };
      })
      .addCase(updateProfileThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
