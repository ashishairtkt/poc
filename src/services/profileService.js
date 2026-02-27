import { supabase } from "./supabaseClient";

const AVATAR_BUCKET = "avatars";

const inferFileExt = (file) => {
  const name = file?.name || "";
  const dot = name.lastIndexOf(".");
  if (dot >= 0 && dot < name.length - 1) return name.slice(dot + 1).toLowerCase();
  if (file?.type === "image/png") return "png";
  if (file?.type === "image/jpeg") return "jpg";
  if (file?.type === "image/webp") return "webp";
  return "bin";
};

export const uploadAvatarAndGetUrl = async ({ userId, file }) => {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError) throw new Error(sessionError.message);
  if (!session) {
    throw new Error(
      "Not authenticated with Supabase. Log out and log in again (email/password), then retry."
    );
  }

  const ext = inferFileExt(file);
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: file.type || undefined,
      cacheControl: "3600",
    });
  if (uploadError) {
    throw new Error(
      `${uploadError.message} (If this is a 401/403, check Storage bucket policies for 'avatars'.)`
    );
  }

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("Failed to get avatar URL.");

  // Cache-bust so the UI updates immediately after replacing the file.
  return `${data.publicUrl}?v=${Date.now()}`;
};

export const upsertProfile = async ({ userId, email, fullName, avatarUrl }) => {
  const payload = {
    id: userId,
    email,
    full_name: fullName,
    avatar_url: avatarUrl ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" });
  if (error) throw new Error(error.message);

  return {
    id: userId,
    email,
    fullName,
    avatar: avatarUrl ?? null,
  };
};

export const updateAuthMetadata = async ({ fullName, avatarUrl }) => {
  const { error } = await supabase.auth.updateUser({
    data: {
      full_name: fullName,
      avatar_url: avatarUrl ?? null,
    },
  });
  if (error) throw new Error(error.message);
};
