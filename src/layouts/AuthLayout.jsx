import { Outlet, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { AppLoader } from "@/components/base/loader/app-loader";


const AuthLayout = () => {
    const { isAuthenticated, isLoading } = useSelector(
        (state) => state.auth
    );

    // Prevent UI flicker while checking auth
    if (isLoading) {
        return <AppLoader label="Checking authentication…" />;
    }

    // If user already logged in → redirect
    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <div className="min-h-screen flex">

            {/* Left Panel */}
            <div className="hidden md:flex w-1/2 bg-indigo-600 text-white items-center justify-center">
                <div>
                    <h1 className="text-3xl font-semibold">Welcome Back</h1>
                    <p className="mt-2 text-indigo-100">
                        Please login to continue
                    </p>
                </div>
            </div>

            {/* Right Panel (Form) */}
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-md">
                    <Outlet />
                </div>
            </div>

        </div>
    );
};

export default AuthLayout;
