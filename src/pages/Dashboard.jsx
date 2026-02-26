import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useDispatch } from "react-redux";
import { refreshTokenThunk } from "../redux/reducers/authSlice";
import { Clock, ShieldCheck } from "lucide-react";

function useTokenCountdown(expiresAt) {
    const [secondsLeft, setSecondsLeft] = useState(null);

    useEffect(() => {
        if (!expiresAt) return;

        const tick = () => {
            const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
            setSecondsLeft(diff);
        };

        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [expiresAt]);

    return secondsLeft;
}

export default function Dashboard() {
    const { user, tokenExpiry, token } = useAuth();
    const dispatch = useDispatch();
    const secondsLeft = useTokenCountdown(tokenExpiry);

    const handleRefresh = () => {
        dispatch(refreshTokenThunk());
    };

    const formatCountdown = (s) => {
        if (s === null) return "—";
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}m ${String(sec).padStart(2, "0")}s`;
    };

    const expiryPercent = tokenExpiry
        ? Math.min(
            100,
            Math.max(
                0,
                ((tokenExpiry - Date.now()) / (15 * 60 * 1000)) * 100
            )
        )
        : 100;

    // Derive initials for avatar
    const initials = user?.fullName
        ? user.fullName
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()
        : "U";

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <main className="flex-1 flex items-start justify-center px-4 py-10">
                <div className="w-full max-w-lg space-y-4">

                    {/* User Card */}
                    <div className="bg-white rounded-2xl shadow-sm p-6">
                        <div className="flex items-center gap-4">
                            {/* Initials Avatar */}
                            <div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                                {initials}
                            </div>
                            {/* Info */}
                            <div className="min-w-0">
                                <h1 className="text-base font-semibold text-gray-900 truncate">
                                    {user?.fullName ?? "User"}
                                </h1>
                                <p className="text-sm text-gray-500 truncate">{user?.email}</p>
                                <span className="mt-1 inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 rounded-full px-2 py-0.5 font-medium">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                                    Active session
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Token Info Card */}
                    <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
                        <div className="flex items-center gap-2 text-gray-700 font-medium">
                            <ShieldCheck size={18} className="text-indigo-500" />
                            Session &amp; Token
                        </div>

                        {/* Countdown */}
                        <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-1.5 text-gray-500">
                                <Clock size={14} />
                                Token expires in
                            </span>
                            <span
                                className={`font-semibold tabular-nums ${secondsLeft !== null && secondsLeft < 60
                                    ? "text-red-500"
                                    : "text-gray-800"
                                    }`}
                            >
                                {formatCountdown(secondsLeft)}
                            </span>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 ${expiryPercent < 20
                                    ? "bg-red-500"
                                    : expiryPercent < 50
                                        ? "bg-amber-400"
                                        : "bg-indigo-500"
                                    }`}
                                style={{ width: `${expiryPercent}%` }}
                            />
                        </div>

                        {/* Truncated token */}
                        <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-400 font-mono break-all">
                            {token ? `${token.slice(0, 40)}…` : "—"}
                        </div>

                        {/* Manual refresh */}
                        <button
                            onClick={handleRefresh}
                            className="w-full text-sm text-indigo-600 font-medium border border-indigo-200 hover:bg-indigo-50 rounded-lg py-2 transition"
                        >
                            Refresh Token Manually
                        </button>
                    </div>

                    {/* Welcome blurb */}
                    <p className="text-center text-sm text-gray-400">
                        You are securely authenticated. This is a protected page.
                    </p>
                </div>
            </main>
        </div>
    );
}
