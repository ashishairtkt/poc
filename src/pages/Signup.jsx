import React, { useReducer, useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/base/input/input";
import { useAuth } from "../hooks/useAuth";
import { useDispatch, useSelector } from "react-redux";
import { clearError } from "../redux/reducers/authSlice";
import { GoogleLogin } from "@react-oauth/google";

// ─── Validation ───────────────────────────────────────────────────────────────
const validate = (field, value, allValues) => {
    switch (field) {
        case "fullName":
            if (!value.trim()) return "Full name is required.";
            if (value.trim().length < 2) return "Name must be at least 2 characters.";
            return "";
        case "email":
            if (!value.trim()) return "Email is required.";
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
                return "Enter a valid email address.";
            return "";
        case "password":
            if (!value) return "Password is required.";
            if (value.length < 6) return "Password must be at least 6 characters.";
            return "";
        case "confirmPassword":
            if (!value) return "Please confirm your password.";
            if (value !== allValues.password) return "Passwords do not match.";
            return "";
        default:
            return "";
    }
};

// ─── Reducer ──────────────────────────────────────────────────────────────────
const initialFormState = {
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agree: false,
    errors: {
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
    },
    touched: {
        fullName: false,
        email: false,
        password: false,
        confirmPassword: false,
    },
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
export default function Signup() {
    const [formState, dispatch] = useReducer(formReducer, initialFormState);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const navigate = useNavigate();
    const { signup, loginWithGoogle } = useAuth();
    const reduxDispatch = useDispatch();
    const { isLoading, error: serverError } = useSelector((s) => s.auth);
    const debounceTimers = useRef({});

    // Clear server error on mount
    useEffect(() => {
        reduxDispatch(clearError());
    }, [reduxDispatch]);

    // ── Debounced field validation ────────────────────────────────────────
    const handleChange = (field, value) => {
        dispatch({ type: "SET_FIELD", field, value });
        dispatch({ type: "SET_TOUCHED", field });

        // Build latest values for cross-field validation (e.g. confirmPassword vs password)
        const latestValues = {
            ...formState,
            [field]: value,
        };

        clearTimeout(debounceTimers.current[field]);
        debounceTimers.current[field] = setTimeout(() => {
            const error = validate(field, value, latestValues);
            dispatch({ type: "SET_ERROR", field, error });

            // Re-validate confirmPassword when password changes
            if (field === "password" && formState.touched.confirmPassword) {
                const cpError = validate(
                    "confirmPassword",
                    latestValues.confirmPassword,
                    latestValues
                );
                dispatch({ type: "SET_ERROR", field: "confirmPassword", error: cpError });
            }
        }, 300);
    };

    // ── Submit ────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();

        const fields = ["fullName", "email", "password", "confirmPassword"];
        let hasError = false;

        fields.forEach((field) => {
            dispatch({ type: "SET_TOUCHED", field });
            const error = validate(field, formState[field], formState);
            dispatch({ type: "SET_ERROR", field, error });
            if (error) hasError = true;
        });

        if (hasError) return;

        if (!formState.agree) {
            return; // Terms checkbox required
        }

        const result = await signup({
            fullName: formState.fullName.trim(),
            email: formState.email.trim(),
            password: formState.password,
        });

        if (!result.error) {
            navigate("/dashboard", { replace: true });
        }
    };

    const handleGoogleSignup = async (response) => {
        const result = await loginWithGoogle(response.credential);
        if (!result.error) {
            navigate("/dashboard", { replace: true });
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-md">

                {/* Header */}
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-semibold text-gray-900">
                        Create your account
                    </h1>
                    <p className="text-sm text-gray-500 mt-2">
                        Start your journey with us today.
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5" noValidate>

                    {/* Full Name */}
                    <div>
                        <Input
                            isRequired
                            label="Full name"
                            placeholder="Enter your full name"
                            type="text"
                            value={formState.fullName}
                            onChange={(value) => handleChange("fullName", value)}
                        />
                        {formState.touched.fullName && formState.errors.fullName && (
                            <p className="text-red-500 text-xs mt-1">
                                {formState.errors.fullName}
                            </p>
                        )}
                    </div>

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
                                placeholder="Create a password"
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

                    {/* Confirm Password */}
                    <div>
                        <div className="relative">
                            <Input
                                isRequired
                                label="Confirm password"
                                placeholder="Re-enter your password"
                                type={showConfirmPassword ? "text" : "password"}
                                value={formState.confirmPassword}
                                onChange={(value) => handleChange("confirmPassword", value)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword((p) => !p)}
                                className="absolute right-3 top-[38px] text-gray-500"
                                aria-label={
                                    showConfirmPassword
                                        ? "Hide confirm password"
                                        : "Show confirm password"
                                }
                            >
                                {showConfirmPassword ? (
                                    <EyeOff size={18} />
                                ) : (
                                    <Eye size={18} />
                                )}
                            </button>
                        </div>
                        {formState.touched.confirmPassword &&
                            formState.errors.confirmPassword && (
                                <p className="text-red-500 text-xs mt-1">
                                    {formState.errors.confirmPassword}
                                </p>
                            )}
                    </div>

                    {/* Terms */}
                    <label className="flex items-start gap-2 text-sm cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formState.agree}
                            onChange={(e) =>
                                dispatch({
                                    type: "SET_FIELD",
                                    field: "agree",
                                    value: e.target.checked,
                                })
                            }
                            className="mt-1 h-4 w-4 rounded border-gray-300"
                        />
                        <span className="text-gray-600">
                            I agree to the{" "}
                            <a href="/terms" className="text-indigo-600 font-medium hover:underline">
                                Terms
                            </a>{" "}
                            and{" "}
                            <a href="/privacy" className="text-indigo-600 font-medium hover:underline">
                                Privacy Policy
                            </a>
                        </span>
                    </label>

                    {/* Server error */}
                    {serverError && (
                        <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                            {serverError}
                        </p>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isLoading || !formState.agree}
                        className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading && (
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        )}
                        {isLoading ? "Creating account…" : "Create account"}
                    </button>

                    {/* Google */}
                    <div className="flex justify-center">
                        <GoogleLogin
                            onSuccess={handleGoogleSignup}
                            onError={() => console.log('Signup Failed')}
                            useOneTap
                            theme="outline"
                            size="large"
                            text="signup_with"
                            shape="rectangular"
                            width="100%"
                        />
                    </div>
                </form>

                {/* Footer */}
                <p className="text-sm text-center text-gray-600 mt-6">
                    Already have an account?{" "}
                    <Link
                        to="/auth/login"
                        className="text-indigo-600 font-medium hover:underline"
                    >
                        Log in
                    </Link>
                </p>
            </div>
        </div>
    );
}
