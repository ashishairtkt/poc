import React from "react";

export const AppLoader = ({ label = "Loading…" }) => {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gray-50 px-4"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 rounded-full border-4 border-indigo-500/20 border-t-indigo-600 animate-spin" />
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
};

