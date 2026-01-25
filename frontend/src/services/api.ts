import type { Report, ReportStatus, ReportType } from '../types/report';
import type { Claim, ClaimStatus } from '../types/claim'; // Ensure Claim/ClaimStatus are imported
// FIX: Ensure correct import of fetchCsrfToken from authApi.ts
import { fetchCsrfToken } from './authApi'; 

const API_URL = 'http://localhost:8000/api'; // <-- FIXED HOSTNAME
const REPORT_URL = `${API_URL}/reports/`;
const CLAIM_URL = `${API_URL}/claims/`; // <-- NEW CLAIM URL
const USER_URL = `${API_URL}/users/`;
const DASHBOARD_STATS_URL = `${API_URL}/dashboard/stats/`; // <-- NEW URL

// --- Utility function to get CSRF Token from cookie ---
const getCsrfToken = () => {
    const name = 'csrftoken';
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // --- ROBUST CHECK HERE ---
            if (cookie.startsWith(name + '=')) { 
                return decodeURIComponent(cookie.substring(name.length + 1));
            }
        }
    }
    return null;
};

// --- TYPES for API PAYLOAD (data sent to backend) ---
export interface ReportPayload {
  itemName: string; 
  description: string;
  type: ReportType;
  category: string;
  location: string;
  date: string;
}

// =================================================================
//                      REPORT API FUNCTIONS
// =================================================================


// Define the expected return structure for clarity in frontend logic
interface DashboardStats {
  totalReports: number;
  totalLostItems: number;
  totalFoundItems: number;
  totalClaimedItems: number;
  totalUnclaimedItems: number; // <-- Added this
  pendingReports: number;
  totalUsers: number;
  reportsByMonth: { month: string; value: number }[];
}
/**
 * Fetches core statistics for the Admin Dashboard.
 */
export const fetchDashboardStats = async (): Promise<DashboardStats> => {
    // CRITICAL FIX: Explicitly call fetchCsrfToken() to ensure the session cookie 
    // is present and active before hitting the protected API endpoint.
    const csrfToken = await fetchCsrfToken(); 

    if (!csrfToken) {
      // If the robust fetcher failed, the user is likely not logged in or the session is corrupted.
      throw new Error('Authentication required for dashboard access.');
    }
    
    // Authentication is required, so we must include credentials.
    const response = await fetch(DASHBOARD_STATS_URL, { 
      credentials: 'include', 
      headers: {
        // Including the token even in the header for a GET can help satisfy Django's check
        'X-CSRFToken': csrfToken, 
      }
    }); 
    
    if (!response.ok) {
      const errorData = await response.json();
      // Throw the raw error detail from the server for better debugging
      throw new Error(JSON.stringify(errorData)); 
    }
  
    return response.json() as Promise<DashboardStats>;
};

// =================================================================
//                      CLAIM API FUNCTIONS
// =================================================================

// --- Create a new claim (User) ---
export const createClaim = async (reportId: number, proofDescription: string) => {
  const csrfToken = await fetchCsrfToken();
  
  if (!csrfToken) {
    throw new Error('CSRF token not found. Please ensure you are logged in.');
  }

  const response = await fetch(CLAIM_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken,
    },
    body: JSON.stringify({ 
      reportId: reportId, 
      proofDescription: proofDescription 
    }),
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(JSON.stringify(errorData));
  }

  return response.json();
};

// --- NEW: Fetch all claims (Admin sees all, User sees own) ---
export const fetchClaims = async (): Promise<Claim[]> => {
  // Authentication is required, include credentials
  const response = await fetch(CLAIM_URL, { 
    credentials: 'include' 
  });

  if (!response.ok) {
    throw new Error('Failed to fetch claims');
  }
  return response.json();
};

// --- NEW: Update claim status (Approve/Reject) ---
export const updateClaimStatus = async (id: number, status: ClaimStatus): Promise<Claim> => {
  const csrfToken = await fetchCsrfToken();
  if (!csrfToken) throw new Error('CSRF token not found. Please ensure you are logged in.');

  const response = await fetch(`${CLAIM_URL}${id}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken,
    },
    body: JSON.stringify({ status }),
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(JSON.stringify(errorData));
  }
  return response.json();
};

// =================================================================
//                      REPORT CRUD FUNCTIONS
// =================================================================

/**
 * Creates a new report (Lost or Found item).
 */
export const createReport = async (data: ReportPayload, imageFile: File | null): Promise<Report> => {
  // --- FIX: Use the robust fetcher directly and let it handle retries/delays ---
  const csrfToken = await fetchCsrfToken();
  
  if (!csrfToken) {
    // If it's still missing after the attempt, throw the error.
    throw new Error('CSRF token not found. Please ensure you are logged in.'); 
  }

  const formData = new FormData();
  
  // Append text/JSON data fields
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value.toString());
  });

  if (imageFile) {
    formData.append('image', imageFile);
  }

  const response = await fetch(REPORT_URL, {
    method: 'POST',
    headers: {
      // Must include X-CSRFToken for POST requests
      'X-CSRFToken': csrfToken, 
    },
    body: formData,
    credentials: 'include', // Mandatory to send session/CSRF cookies
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(JSON.stringify(errorData)); 
  }

  return response.json();
};

/**
 * Fetches reports, with optional filtering by type and status.
 */
export const fetchReports = async (type?: ReportType, status?: ReportStatus): Promise<Report[]> => {
  let url = REPORT_URL;
  const params = new URLSearchParams();

  if (type) params.append('type', type);
  if (status) params.append('status', status);

  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  // Credentials must be included even for GET to maintain session/authentication checks
  const response = await fetch(url, { credentials: 'include' }); 
  
  if (!response.ok) {
    throw new Error('Failed to fetch reports');
  }

  return response.json();
};


/**
 * Updates the status of an existing report (Used by Admin).
 */
export const updateReportStatus = async (id: number, newStatus: ReportStatus): Promise<Report> => {
  const csrfToken = getCsrfToken();
  if (!csrfToken) {
    throw new Error('CSRF token not found. Please ensure you are logged in.');
  }

  const response = await fetch(`${REPORT_URL}${id}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken, 
    },
    body: JSON.stringify({ status: newStatus }),
    credentials: 'include', 
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(JSON.stringify(errorData));
  }
  
  return response.json();
};

/**
 * Updates an existing report (Used by report owner).
 * Allows editing itemName, description, category, location, date, and image.
 */
export const updateReport = async (id: number, data: Partial<ReportPayload>, imageFile?: File | null): Promise<Report> => {
  const csrfToken = await fetchCsrfToken();
  if (!csrfToken) {
    throw new Error('CSRF token not found. Please ensure you are logged in.');
  }

  const formData = new FormData();
  
  // Append only provided fields
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value.toString());
    }
  });

  // Append new image if provided
  if (imageFile) {
    formData.append('image', imageFile);
  }

  const response = await fetch(`${REPORT_URL}${id}/`, {
    method: 'PATCH',
    headers: {
      'X-CSRFToken': csrfToken,
    },
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(JSON.stringify(errorData));
  }

  return response.json();
};

/**
 * Deletes a report (Used by report owner or admin).
 */
export const deleteReport = async (id: number): Promise<void> => {
  const csrfToken = await fetchCsrfToken();
  if (!csrfToken) {
    throw new Error('CSRF token not found. Please ensure you are logged in.');
  }

  const response = await fetch(`${REPORT_URL}${id}/`, {
    method: 'DELETE',
    headers: {
      'X-CSRFToken': csrfToken,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    // Handle non-204 responses
    if (response.status !== 204) {
      const errorData = await response.json().catch(() => ({ detail: 'Failed to delete report' }));
      throw new Error(JSON.stringify(errorData));
    }
  }
};


// =================================================================
//                      USER API FUNCTIONS (Existing)
// =================================================================

export const fetchUsers = async () => {
  // Use credentials: 'include' to ensure session is sent
  const response = await fetch(USER_URL, { credentials: 'include' });
  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }
  return response.json();
};

// delete user
export const deleteUser = async (id: number) => {
  const csrfToken = getCsrfToken();
  if (!csrfToken) {
    throw new Error('CSRF token not found.');
  }
  const response = await fetch(`${USER_URL}${id}/`, {
    method: 'DELETE',
    headers: {
      'X-CSRFToken': csrfToken,
    },
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to delete user');
  }
};

// update user
export const updateUser = async (id: number, data: any) => {
  const csrfToken = getCsrfToken();
  if (!csrfToken) {
    throw new Error('CSRF token not found.');
  }

  const response = await fetch(`${USER_URL}${id}/`, {
    method: 'PATCH', 
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken, 
    },
    body: JSON.stringify(data),
    credentials: 'include', 
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(JSON.stringify(errorData));
  }
  
  return response.json();
};


// profile report
export const fetchMyReports = async (): Promise<Report[]> => {
  // The 'my_reports' action creates a URL like: /api/reports/my_reports/
  const response = await fetch(`${REPORT_URL}my_reports/`, { 
    credentials: 'include' 
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch user reports');
  }

  const data = await response.json();
  
  // The backend might return a paginated object ({ count: ..., results: [...] }) 
  // or a flat array depending on your pagination settings. 
  // This check handles both cases safely.
  if (Array.isArray(data)) {
    return data;
  } else if (data.results && Array.isArray(data.results)) {
    return data.results;
  }
  
  return [];
};

// --- PROFILE API FUNCTIONS ---
/**
 * Updates user profile information (name, email, etc.)
 */
export const updateProfile = async (userId: number, data: { first_name?: string; last_name?: string; email?: string }): Promise<any> => {
  const csrfToken = await fetchCsrfToken();
  if (!csrfToken) {
    throw new Error('CSRF token not found. Please ensure you are logged in.');
  }

  const response = await fetch(`${USER_URL}${userId}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken,
    },
    body: JSON.stringify(data),
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(JSON.stringify(errorData));
  }

  return response.json();
};

/**
 * Fetches current user data
 */
export const fetchCurrentUser = async (userId: number): Promise<any> => {
  const response = await fetch(`${USER_URL}${userId}/`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user data');
  }

  return response.json();
};

/**
 * Uploads/updates user avatar
 */
export const uploadAvatar = async (userId: number, imageFile: File): Promise<any> => {
  const csrfToken = await fetchCsrfToken();
  if (!csrfToken) {
    throw new Error('CSRF token not found. Please ensure you are logged in.');
  }

  const formData = new FormData();
  formData.append('avatar', imageFile);

  const response = await fetch(`${USER_URL}${userId}/`, {
    method: 'PATCH',
    headers: {
      'X-CSRFToken': csrfToken,
    },
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(JSON.stringify(errorData));
  }

  return response.json();
};


export interface Notification {
  id: number;
  message: string;
  is_read: boolean;
  created_at: string;
  report: number | null;
}

const NOTIFICATION_URL = `${API_URL}/notifications/`;

// --- NOTIFICATION API ---
export const fetchNotifications = async (): Promise<Notification[]> => {
  const response = await fetch(NOTIFICATION_URL, { credentials: 'include' });
  if (!response.ok) throw new Error('Failed to fetch notifications');
  return response.json();
};

export const markNotificationRead = async (id: number) => {
  const csrfToken = await fetchCsrfToken(); // Ensure you import fetchCsrfToken
  await fetch(`${NOTIFICATION_URL}${id}/mark_read/`, {
    method: 'POST',
    headers: { 'X-CSRFToken': csrfToken || '' },
    credentials: 'include',
  });
};

export const markAllNotificationsRead = async () => {
  const csrfToken = await fetchCsrfToken();
  await fetch(`${NOTIFICATION_URL}mark_all_read/`, {
    method: 'POST',
    headers: { 'X-CSRFToken': csrfToken || '' },
    credentials: 'include',
  });
};

const ACTIVITY_URL = `${API_URL}/dashboard/activity/`;

export interface Activity {
  id: string;
  user: string;
  role: string; // Added role to show "Student" or "Teacher"
  action: string;
  item: string;
  timestamp: string;
}

export const fetchActivityFeed = async (): Promise<Activity[]> => {
  const csrfToken = await fetchCsrfToken();
  if (!csrfToken) throw new Error('Authentication required');

  const response = await fetch(ACTIVITY_URL, {
    credentials: 'include',
    headers: { 'X-CSRFToken': csrfToken },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch activity feed');
  }
  return response.json();
};