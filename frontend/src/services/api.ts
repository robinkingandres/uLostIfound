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
 * @param timePeriod - 'weekly', 'monthly', or 'yearly' (default)
 * @param statusFilter - 'all', 'lost', 'found', or 'claimed' (default: 'all')
 */
export const fetchDashboardStats = async (timePeriod: string = 'yearly', statusFilter: string = 'all'): Promise<DashboardStats> => {
    // CRITICAL FIX: Explicitly call fetchCsrfToken() to ensure the session cookie 
    // is present and active before hitting the protected API endpoint.
    const csrfToken = await fetchCsrfToken(); 

    if (!csrfToken) {
      // If the robust fetcher failed, the user is likely not logged in or the session is corrupted.
      throw new Error('Authentication required for dashboard access.');
    }
    
    // Build URL with query parameters
    const url = new URL(DASHBOARD_STATS_URL, window.location.origin);
    url.searchParams.append('time_period', timePeriod);
    url.searchParams.append('status', statusFilter);
    
    // Authentication is required, so we must include credentials.
    const response = await fetch(url.toString(), { 
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
export const createClaim = async (reportId: number, proofDescription: string, proofImage: File | null) => {
  const csrfToken = await fetchCsrfToken();
  
  if (!csrfToken) {
    throw new Error('CSRF token not found. Please ensure you are logged in.');
  }

  const formData = new FormData();
  formData.append('reportId', reportId.toString());
  formData.append('proofDescription', proofDescription);
  
  if (proofImage) {
    formData.append('proofImage', proofImage);
  }

  const response = await fetch(CLAIM_URL, {
    method: 'POST',
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
 * Note: 'type' should not be changed after creation.
 */
export const updateReport = async (id: number, data: Partial<Omit<ReportPayload, 'type'>>, imageFile?: File | null): Promise<Report> => {
  const csrfToken = await fetchCsrfToken();
  if (!csrfToken) {
    throw new Error('CSRF token not found. Please ensure you are logged in.');
  }

  const formData = new FormData();
  
  // Append only provided fields (exclude type as it shouldn't be changed)
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null && key !== 'type') {
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

// create user (Admin only)
export const createUser = async (data: { username: string; email: string; school_id: string; role: string; password: string }) => {
  const csrfToken = getCsrfToken();
  if (!csrfToken) throw new Error('CSRF token not found.');
  const response = await fetch(USER_URL, {
    method: 'POST',
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

// =================================================================
//                      AI MATCH API FUNCTIONS
// =================================================================

const AI_MATCH_URL = `${API_URL}/ai-matches/`;

export interface AIMatchItem {
  id: number;
  itemName: string;
  description: string;
  category: string;
  location: string;
  image: string;
  reporterId: number;
  reporterName: string;
}

export interface AIMatch {
  id: number;
  lostItem: AIMatchItem;
  foundItem: AIMatchItem;
  visualScore: number;
  textScore: number;
  matchScore: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  date: string;
  lost_reporter_notified: boolean;
  found_reporter_notified: boolean;
}

export interface AIMatchStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

/**
 * Fetch all AI matches (Admin only for all, users see their approved matches)
 */
export const fetchAIMatches = async (status?: string): Promise<AIMatch[]> => {
  let url = AI_MATCH_URL;
  if (status) {
    url += `?status=${status}`;
  }
  
  const response = await fetch(url, { credentials: 'include' });
  
  if (!response.ok) {
    throw new Error('Failed to fetch AI matches');
  }
  return response.json();
};

/**
 * Get AI match statistics (Admin only)
 */
export const fetchAIMatchStats = async (): Promise<AIMatchStats> => {
  const response = await fetch(`${AI_MATCH_URL}stats/`, { credentials: 'include' });
  
  if (!response.ok) {
    throw new Error('Failed to fetch AI match stats');
  }
  return response.json();
};

/**
 * Update AI match status (Approve/Reject)
 */
export const updateAIMatchStatus = async (id: number, status: 'Approved' | 'Rejected'): Promise<AIMatch> => {
  const csrfToken = await fetchCsrfToken();
  if (!csrfToken) throw new Error('CSRF token not found. Please ensure you are logged in.');

  const response = await fetch(`${AI_MATCH_URL}${id}/`, {
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

/**
 * Trigger AI scan for all potential matches (Admin only)
 */
export const triggerAIScan = async (minScore: number = 50): Promise<{ status: string; message: string; matches_created: number }> => {
  const csrfToken = await fetchCsrfToken();
  if (!csrfToken) throw new Error('CSRF token not found. Please ensure you are logged in.');

  const response = await fetch(`${AI_MATCH_URL}scan_all/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken,
    },
    body: JSON.stringify({ min_score: minScore }),
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(JSON.stringify(errorData));
  }
  return response.json();
};

/**
 * Get matches for the current user's reports
 */
export const fetchMyAIMatches = async (): Promise<AIMatch[]> => {
  const response = await fetch(`${AI_MATCH_URL}my_matches/`, { credentials: 'include' });
  
  if (!response.ok) {
    throw new Error('Failed to fetch your AI matches');
  }
  return response.json();
};

/**
 * Get AI matches for a specific report
 */
export const fetchReportAIMatches = async (reportId: number): Promise<AIMatch[]> => {
  const response = await fetch(`${AI_MATCH_URL}?report_id=${reportId}`, { credentials: 'include' });
  
  if (!response.ok) {
    throw new Error('Failed to fetch AI matches for this report');
  }
  return response.json();
};

// =================================================================
//                      ANALYTICS API FUNCTIONS
// =================================================================

const ANALYTICS_URL = `${API_URL}/analytics/`;

export interface AnalyticsData {
  averageResolutionTime: number;
  aiMatchAccuracy: number;
  successRate: number;
  lostFoundPattern: { period: string; lost: number; found: number }[];
  claimProcessingEfficiency: { period: string; claimed: number; found: number; verified: number }[];
  statusDistribution: Record<string, number>;
  categoryDistribution: { category: string; count: number; percentage: number }[];
  timeFrame: string;
  dateFormat: string;
}

/**
 * Fetches comprehensive analytics data for the Analytics page
 * @param timeFrame - 'daily', 'weekly', 'monthly', or 'yearly'
 */
export const fetchAnalytics = async (timeFrame: string = 'monthly'): Promise<AnalyticsData> => {
  const csrfToken = await fetchCsrfToken();
  if (!csrfToken) throw new Error('Authentication required');

  const response = await fetch(`${ANALYTICS_URL}?time_frame=${timeFrame}`, {
    credentials: 'include',
    headers: {
      'X-CSRFToken': csrfToken,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch analytics data');
  }
  return response.json();
};

// =================================================================
//                      LOST & FOUND DASHBOARD API
// =================================================================

const LOST_FOUND_DASHBOARD_URL = `${API_URL}/lost-found-dashboard/`;

export interface LostFoundDashboardData {
  summary: {
    totalLost: number;
    totalFound: number;
    totalReturned: number;
    unclaimed: number;
    avgReturnTime: number;
  };
  categories: Array<{ category: string; lost_count: number; found_count: number }>;
  topLostItems: Array<{ item_name: string; count: number }>;
  topFoundItems: Array<{ item_name: string; count: number }>;
  categoryTrends: Array<{ day: string; category: string; lost: number; found: number }>;
  locationLost: Array<{ location: string; count: number }>;
  locationFound: Array<{ location: string; count: number }>;
  usersReportingLost: number;
  usersReportingFound: number;
  repeatUsers: Array<{ reporter: number; reporter__username: string; report_count: number }>;
  avgResponseTime: number;
  dailyTrends: Array<{ day: string; lost: number; found: number }>;
  peakTimes: Array<{ hour: number; lost: number; found: number }>;
  recoveryRate: number;
  stuckItems: number;
  alerts: {
    highLossAlert: boolean;
    recentLostCount: number;
    unclaimedOld: number;
  };
}

/**
 * Fetches comprehensive Lost & Found dashboard data
 */
export const fetchLostFoundDashboard = async (): Promise<LostFoundDashboardData> => {
  const csrfToken = await fetchCsrfToken();
  if (!csrfToken) throw new Error('Authentication required');

  const response = await fetch(LOST_FOUND_DASHBOARD_URL, {
    credentials: 'include',
    headers: {
      'X-CSRFToken': csrfToken,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch lost & found dashboard data');
  }
  return response.json();
};