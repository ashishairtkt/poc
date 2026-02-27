import { supabase } from "./supabaseClient";

const toAppUser = (authUser, profile) => {
  const meta = authUser?.user_metadata ?? {};
  return {
    id: authUser.id,
    email: authUser.email,
    fullName:
      profile?.full_name ||
      meta.full_name ||
      meta.fullName ||
      authUser.email?.split("@")?.[0] ||
      "",
    avatar: profile?.avatar_url || meta.avatar_url || meta.picture || null,
  };
};

const sessionToPayload = (session, profile) => ({
  user: toAppUser(session.user, profile),
  token: session.access_token,
  refreshToken: session.refresh_token,
  expiresAt: session.expires_at ? session.expires_at * 1000 : null,
});

const tryFetchProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", userId)
      .maybeSingle();
    if (error) return null;
    return data ?? null;
  } catch {
    return null;
  }
};

const tryUpsertProfile = async ({ id, email, fullName, avatarUrl }) => {
  try {
    const { error } = await supabase.from("profiles").upsert(
      {
        id,
        email,
        full_name: fullName,
        avatar_url: avatarUrl ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    if (error) throw error;
  } catch (err) {
    // Keep signup working even if `profiles`/RLS isn't configured yet.
    console.warn("Supabase profile upsert failed:", err?.message || err);
  }
};

export const loginApi = async ({ email, password }) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw new Error(error.message);
  if (!data?.session) throw new Error("Login failed. Please try again.");

  const profile = await tryFetchProfile(data.session.user.id);
  return sessionToPayload(data.session, profile);
};

export const signupApi = async ({ fullName, email, password }) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });
  if (error) throw new Error(error.message);

  // If email confirmation is enabled, Supabase returns no session.
  if (!data?.session) {
    throw new Error("Check your email to confirm your account, then log in.");
  }

  await tryUpsertProfile({
    id: data.session.user.id,
    email,
    fullName,
  });

  const profile = await tryFetchProfile(data.session.user.id);
  return sessionToPayload(data.session, profile);
};

export const refreshTokenApi = async (refreshToken) => {
  if (!refreshToken) throw new Error("Session expired. Please log in again.");

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });
  if (error) throw new Error(error.message);
  if (!data?.session) throw new Error("Session expired. Please log in again.");

  return {
    token: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at ? data.session.expires_at * 1000 : null,
  };
};

export const logoutApi = async () => {
  await supabase.auth.signOut();
};
