const API_URL = `${import.meta.env.VITE_API_URL}/api`; 

const LOGIN_URL = `${API_URL}/auth/login/`;
const LOGOUT_URL = `${API_URL}/auth/logout/`;
const RESET_REQUEST_URL = `${API_URL}/auth/password-reset/request/`;
const RESET_VERIFY_URL = `${API_URL}/auth/password-reset/verify-code/`;
const RESET_CONFIRM_URL = `${API_URL}/auth/password-reset/confirm/`;

// --- NEW: In-Memory Token Storage ---
// This keeps the token active without needing to read blocked cookies
let cachedCsrfToken: string | null = null;

// --- EXPORTED CSRF TOKEN FETCH FUNCTION ---
/**
 * Fetches the CSRF token from a dedicated Django JSON endpoint.
 */
export const fetchCsrfToken = async (): Promise<string | null> => {
    // If we already have the token in memory, just return it
    if (cachedCsrfToken) return cachedCsrfToken; 

    try {
        // We call a specific Django URL that returns { "csrfToken": "..." }
        const response = await fetch(`${API_URL}/csrf/`, { 
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            cachedCsrfToken = data.csrfToken; // Save it to memory
            return cachedCsrfToken;
        } else {
            console.error("Failed to retrieve CSRF token from server. Status:", response.status);
            return null;
        }
    } catch (error) {
        console.error("Network error while fetching CSRF token:", error);
        return null;
    }
};

// --- AUTH API CALLS ---

/**
 * Handles user login against the Django backend.
 */
export const fetchLogin = async (username: string, password: string): Promise<any> => {
    // Await the JSON token fetcher
    const csrfToken = await fetchCsrfToken();
    
    const response = await fetch(LOGIN_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(csrfToken && {'X-CSRFToken': csrfToken}) 
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include', 
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Login failed due to server error.");
    }

    return response.json();
};

/**
 * Handles user logout.
 */
export const fetchLogout = async () => {
    const csrfToken = await fetchCsrfToken();
    
    const response = await fetch(LOGOUT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(csrfToken && {'X-CSRFToken': csrfToken}) 
        },
        credentials: 'include',
    });
    
    if (response.ok) {
        // Clear the token from memory on successful logout
        cachedCsrfToken = null; 
    } else {
        console.error("Server reported error during logout.");
    }
};

/**
 * Requests a 6-digit verification code to be sent to the email.
 */
export const requestPasswordReset = async (email: string) => {
    const response = await fetch(RESET_REQUEST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to send code.');
    }
    return response.json();
};

/**
 * Verifies if reset code is valid before allowing password change step.
 */
export const verifyPasswordResetCode = async (email: string, code: string) => {
    const response = await fetch(RESET_VERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Invalid verification code.');
    }
    return response.json();
};

/**
 * Resets the password using the email, code, and new password.
 */
export const confirmPasswordReset = async (email: string, code: string, password: string) => {
    const response = await fetch(RESET_CONFIRM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, password }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to reset password.');
    }
    return response.json();
};