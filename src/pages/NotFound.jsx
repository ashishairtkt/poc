// src/pages/NotFound.tsx
import { StepBack } from "lucide-react";
import { useNavigate } from "react-router-dom";


export default function NotFound() {
    const navigate = useNavigate();

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white">
            {/* subtle grid background */}
            <div
                className="pointer-events-none absolute inset-0"
                style={{
                    backgroundImage:
                        "linear-gradient(to right, #f1f5f9 1px, transparent 1px), linear-gradient(to bottom, #f1f5f9 1px, transparent 1px)",
                    backgroundSize: "32px 32px",
                }}
            />

            <div className="relative z-10 mx-auto max-w-md text-center">
                {/* icon */}
                <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-lg border border-gray-200 bg-white shadow-sm">
                    <svg
                        className="h-6 w-6 text-gray-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M21 21l-4.35-4.35m1.85-5.65a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z"
                        />
                    </svg>
                </div>

                <h1 className="text-3xl font-semibold text-gray-900">
                    Page not found
                </h1>

                <p className="mt-2 text-sm text-gray-600">
                    The page you are looking for doesn’t exist. Here are some helpful
                    links:
                </p>

                <div className="mt-8 flex items-center justify-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-2 rounded-md border cursor-pointer border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                    >
                        <StepBack className="h-4 w-4" />
                        Go back
                    </button>

                    <button
                        onClick={() => navigate("/")}
                        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium cursor-pointer text-white shadow hover:bg-indigo-700"
                    >
                        Take me home
                    </button>
                </div>
            </div>
        </div>
    );
}