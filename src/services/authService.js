// ─── Mock Auth Service ───────────────────────────────────────────────────────
// Simulates async API calls with setTimeout.
// Token expires in 15 minutes (for demo; refresh happens automatically).
// ─────────────────────────────────────────────────────────────────────────────

const SIMULATED_DELAY = 1000; // ms
const TOKEN_LIFETIME_MS = 15 * 60 * 1000; // 15 minutes

// Fake user store (in-memory, resets on page refresh for mock purposes)
const fakeUsers = [
    {
        id: "1",
        fullName: "Test User",
        email: "test@example.com",
        password: "password123",
    },
];

// Helpers
const generateToken = (userId) =>
    btoa(JSON.stringify({ userId, iat: Date.now() }));

const generateRefreshToken = (userId) =>
    btoa(JSON.stringify({ userId, type: "refresh", iat: Date.now() }));

const buildAuthPayload = (user) => ({
    user: { id: user.id, fullName: user.fullName, email: user.email },
    token: generateToken(user.id),
    refreshToken: generateRefreshToken(user.id),
    expiresAt: Date.now() + TOKEN_LIFETIME_MS,
});

// ─── Login ───────────────────────────────────────────────────────────────────
export const loginApi = ({ email, password }) =>
    new Promise((resolve, reject) => {
        setTimeout(() => {
            const user = fakeUsers.find(
                (u) =>
                    u.email.toLowerCase() === email.toLowerCase() &&
                    u.password === password
            );
            if (!user) {
                reject(new Error("Invalid email or password."));
            } else {
                resolve(buildAuthPayload(user));
            }
        }, SIMULATED_DELAY);
    });

// ─── Signup ──────────────────────────────────────────────────────────────────
export const signupApi = ({ fullName, email, password }) =>
    new Promise((resolve, reject) => {
        setTimeout(() => {
            const exists = fakeUsers.some(
                (u) => u.email.toLowerCase() === email.toLowerCase()
            );
            if (exists) {
                reject(new Error("An account with that email already exists."));
            } else {
                const newUser = {
                    id: String(fakeUsers.length + 1),
                    fullName,
                    email,
                    password,
                };
                fakeUsers.push(newUser);
                resolve(buildAuthPayload(newUser));
            }
        }, SIMULATED_DELAY);
    });

// ─── Refresh Token ───────────────────────────────────────────────────────────
export const refreshTokenApi = (refreshToken) =>
    new Promise((resolve, reject) => {
        setTimeout(() => {
            try {
                const { userId } = JSON.parse(atob(refreshToken));
                const user = fakeUsers.find((u) => u.id === String(userId));
                if (!user) throw new Error("Invalid refresh token.");
                resolve({
                    token: generateToken(user.id),
                    refreshToken: generateRefreshToken(user.id),
                    expiresAt: Date.now() + TOKEN_LIFETIME_MS,
                });
            } catch {
                reject(new Error("Session expired. Please log in again."));
            }
        }, 500);
    });

