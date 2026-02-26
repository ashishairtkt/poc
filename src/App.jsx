import { RouterProvider } from "react-router-dom";
import { router } from "./routes/AppRoutes";
import { Suspense } from "react";
import { AuthProvider } from "./context/AuthContext";
import { GoogleOAuthProvider } from "@react-oauth/google";

const GOOGLE_CLIENT_ID = "494101382211-bg0pabef9cagudq5hh871m0pjsku4uj1.apps.googleusercontent.com"; // Replace with your real Client ID

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <Suspense fallback={<div>Loading…</div>}>
          <RouterProvider router={router} />
        </Suspense>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
