// This file needs to be imported by api.ts, so we must define the root API URL
const API_URL = 'http://localhost:8000/api'; // <-- FIXED HOSTNAMEconst ROOT_API_URL = `${API_URL}/`;
const ROOT_API_URL = `${API_URL}/`;
const LOGIN_URL = `${API_URL}/auth/login/`;
const LOGOUT_URL = `${API_URL}/auth/logout/`;
const RESET_REQUEST_URL = `${API_URL}/auth/password-reset/request/`;
const RESET_VERIFY_URL = `${API_URL}/auth/password-reset/verify-code/`;
const RESET_CONFIRM_URL = `${API_URL}/auth/password-reset/confirm/`;

// --- Utility function to get CSRF Token from cookie ---
const getCsrfToken = () => {
    const name = 'csrftoken';
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.startsWith(name + '=')) { 
                return decodeURIComponent(cookie.substring(name.length + 1));
            }
        }
    }
    return null;
};

// --- EXPORTED CSRF TOKEN FETCH FUNCTION ---
/**
 * Forces a GET request to a safe endpoint (like /api/) to ensure Django sets the csrftoken cookie.
 * This is used as a fallback if the token is unexpectedly missing on subsequent POST requests.
 */
export const fetchCsrfToken = async (maxRetries = 5): Promise<string | null> => {
    let csrfToken = getCsrfToken();
    if (csrfToken) return csrfToken; // Found immediately

    for (let i = 0; i < maxRetries; i++) {
        // Send a safe GET request. Django will set the 'csrftoken' cookie in the response headers.
        await fetch(ROOT_API_URL, { credentials: 'include' });
        
        // Wait briefly for the browser to process the cookie header
        // 100ms is a safe delay for modern browsers to process Set-Cookie headers
        await new Promise(resolve => setTimeout(resolve, 100)); 
        
        csrfToken = getCsrfToken();
        if (csrfToken) {
            console.log(`CSRF token successfully retrieved after ${i + 1} retries.`);
            return csrfToken;
        }
    }
    console.error("Failed to retrieve CSRF token after maximum retries.");
    return null;
};

// --- AUTH API CALLS ---

/**
 * Handles user login against the Django backend.
 */
export const fetchLogin = async (username: string, password: string): Promise<any> => {
    // Attempt to fetch the CSRF token if not present (only done for safety)
    if (!getCsrfToken()) {
        await fetchCsrfToken();
    }
    
    const tokenAfterFetch = getCsrfToken();
    
    const response = await fetch(LOGIN_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(tokenAfterFetch && {'X-CSRFToken': tokenAfterFetch}) 
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
    const csrfToken = getCsrfToken();
    
    const response = await fetch(LOGOUT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(csrfToken && {'X-CSRFToken': csrfToken}) 
        },
        credentials: 'include',
    });
    
    if (!response.ok) {
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
