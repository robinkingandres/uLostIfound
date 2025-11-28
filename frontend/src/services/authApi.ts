// This file needs to be imported by api.ts, so we must define the root API URL
const API_URL = 'http://127.0.0.1:8000/api';
const ROOT_API_URL = `${API_URL}/`;
const LOGIN_URL = `${API_URL}/auth/login/`;
const LOGOUT_URL = `${API_URL}/auth/logout/`;

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
export const fetchCsrfToken = async () => {
    // Send a safe GET request. Django will set the 'csrftoken' cookie in the response headers.
    await fetch(ROOT_API_URL, { credentials: 'include' });
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