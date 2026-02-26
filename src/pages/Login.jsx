import React, { useReducer, useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/base/input/input";
import { useAuth } from "../hooks/useAuth";
import { useDispatch, useSelector } from "react-redux";
import { clearError } from "../redux/reducers/authSlice";
import { GoogleLogin } from "@react-oauth/google";

// ─── Validation ───────────────────────────────────────────────────────────────
const validate = (field, value) => {
    switch (field) {
        case "email":
            if (!value.trim()) return "Email is required.";
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
                return "Enter a valid email address.";
            return "";
        case "password":
            if (!value) return "Password is required.";
            if (value.length < 6) return "Password must be at least 6 characters.";
            return "";
        default:
            return "";
    }
};

// ─── Reducer ──────────────────────────────────────────────────────────────────
const initialFormState = {
    email: "",
    password: "",
    remember: false,
    errors: { email: "", password: "" },
    touched: { email: false, password: false },
};

const formReducer = (state, action) => {
    switch (action.type) {
        case "SET_FIELD":
            return { ...state, [action.field]: action.value };
        case "SET_ERROR":
            return {
                ...state,
                errors: { ...state.errors, [action.field]: action.error },
            };
        case "SET_TOUCHED":
            return {
                ...state,
                touched: { ...state.touched, [action.field]: true },
            };
        case "RESET":
            return initialFormState;
        default:
            return state;
    }
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function Login() {
    const [formState, dispatch] = useReducer(formReducer, initialFormState);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();
    const { login, loginWithGoogle } = useAuth();
    const reduxDispatch = useDispatch();
    const { isLoading, error: serverError } = useSelector((s) => s.auth);
    const debounceTimers = useRef({});

    // Clear server error when component mounts
    useEffect(() => {
        reduxDispatch(clearError());
    }, [reduxDispatch]);

    // ── Debounced field validation ────────────────────────────────────────
    const handleChange = (field, value) => {
        dispatch({ type: "SET_FIELD", field, value });
        dispatch({ type: "SET_TOUCHED", field });

        clearTimeout(debounceTimers.current[field]);
        debounceTimers.current[field] = setTimeout(() => {
            const error = validate(field, value, formState);
            dispatch({ type: "SET_ERROR", field, error });
        }, 300);
    };

    // ── Submit ────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate all fields before submit
        const emailErr = validate("email", formState.email);
        const passwordErr = validate("password", formState.password);
        dispatch({ type: "SET_ERROR", field: "email", error: emailErr });
        dispatch({ type: "SET_ERROR", field: "password", error: passwordErr });
        dispatch({ type: "SET_TOUCHED", field: "email" });
        dispatch({ type: "SET_TOUCHED", field: "password" });

        if (emailErr || passwordErr) return;

        const result = await login({
            email: formState.email,
            password: formState.password,
            remember: formState.remember,
        });

        if (!result.error) {
            navigate("/dashboard", { replace: true });
        }
    };

    const handleGoogleLogin = async (response) => {
        const result = await loginWithGoogle(response.credential);
        if (!result.error) {
            navigate("/dashboard", { replace: true });
        }
    };

    // const isFormInvalid =
    //     !!formState.errors.email || !!formState.errors.password;

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-sm">

                {/* Header */}
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-semibold text-gray-900">
                        Log in to your account
                    </h1>
                    <p className="text-sm text-gray-500 mt-2">
                        Welcome back! Please enter your details.
                    </p>
                </div>

                {/* Form */}
                <form className="space-y-5" onSubmit={handleSubmit} noValidate>

                    {/* Email */}
                    <div>
                        <Input
                            isRequired
                            label="Email"
                            placeholder="Enter your email"
                            type="email"
                            value={formState.email}
                            onChange={(value) => handleChange("email", value)}
                        />
                        {formState.touched.email && formState.errors.email && (
                            <p className="text-red-500 text-xs mt-1">
                                {formState.errors.email}
                            </p>
                        )}
                    </div>

                    {/* Password */}
                    <div>
                        <div className="relative">
                            <Input
                                isRequired
                                label="Password"
                                placeholder="Enter your password"
                                type={showPassword ? "text" : "password"}
                                value={formState.password}
                                onChange={(value) => handleChange("password", value)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((p) => !p)}
                                className="absolute right-3 top-[38px] text-gray-500"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {formState.touched.password && formState.errors.password && (
                            <p className="text-red-500 text-xs mt-1">
                                {formState.errors.password}
                            </p>
                        )}
                    </div>

                    {/* Remember me + Forgot */}
                    <div className="flex items-center justify-between text-sm">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formState.remember}
                                onChange={(e) =>
                                    dispatch({
                                        type: "SET_FIELD",
                                        field: "remember",
                                        value: e.target.checked,
                                    })
                                }
                                className="h-4 w-4 rounded border-gray-300"
                            />
                            <span className="text-gray-600">Remember for 30 days</span>
                        </label>
                        <a
                            href="/auth/forgot-password"
                            className="text-indigo-600 font-medium hover:underline"
                        >
                            Forgot password
                        </a>
                    </div>

                    {/* Server error */}
                    {serverError && (
                        <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                            {serverError}
                        </p>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading && (
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        )}
                        {isLoading ? "Signing in…" : "Sign in"}
                    </button>

                    {/* Google Sign In */}
                    <div className="flex justify-center">
                        <GoogleLogin
                            onSuccess={handleGoogleLogin}
                            onError={() => console.log('Login Failed')}
                            useOneTap
                            theme="outline"
                            size="large"
                            text="signin_with"
                            shape="rectangular"
                            width="100%"
                        />
                    </div>
                </form>

                {/* Footer */}
                <p className="text-sm text-center text-gray-600 mt-6">
                    Don&apos;t have an account?{" "}
                    <Link
                        to="/auth/signup"
                        className="text-indigo-600 font-medium hover:underline"
                    >
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    );
}