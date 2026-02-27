import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Input } from "@/components/base/input/input";
import { useAuth } from "../hooks/useAuth";
import { updateProfileThunk, clearError } from "../redux/reducers/authSlice";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB

export default function Profile() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const { isLoading, error } = useSelector((s) => s.auth);

  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [avatarFile, setAvatarFile] = useState(null);

  const avatarPreviewUrl = useMemo(() => {
    if (!avatarFile) return null;
    return URL.createObjectURL(avatarFile);
  }, [avatarFile]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    };
  }, [avatarPreviewUrl]);

  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  const onPickAvatar = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    dispatch(clearError());

    if (!file.type?.startsWith("image/")) {
      alert("Please choose an image file.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      alert("Image is too large. Max 5MB.");
      return;
    }

    setAvatarFile(file);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    dispatch(clearError());

    const trimmed = fullName.trim();
    if (!trimmed) {
      alert("Full name is required.");
      return;
    }

    await dispatch(updateProfileThunk({ fullName: trimmed, avatarFile }));
    setAvatarFile(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center px-4 py-10">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm p-6 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Profile</h1>
          <p className="text-sm text-gray-500 mt-1">
            Update your name and avatar.
          </p>
        </div>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <div className="flex items-center gap-4">
            <div className="relative">
              {avatarPreviewUrl || user?.avatar ? (
                <img
                  src={avatarPreviewUrl || user.avatar}
                  alt="Avatar"
                  className="w-16 h-16 rounded-full object-cover ring-2 ring-gray-100"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-lg ring-2 ring-gray-100">
                  {initials}
                </div>
              )}
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">
                Avatar
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={onPickAvatar}
                className="mt-1 block w-full text-sm text-gray-600 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
              />
              <p className="text-xs text-gray-400 mt-1">PNG/JPG/WebP, up to 5MB.</p>
            </div>
          </div>

          <Input
            isRequired
            label="Full name"
            placeholder="Enter your full name"
            type="text"
            value={fullName}
            onChange={setFullName}
          />

          <Input
            label="Email"
            type="email"
            value={user?.email ?? ""}
            onChange={() => {}}
            isDisabled
          />

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading && (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {isLoading ? "Savingâ€¦" : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
