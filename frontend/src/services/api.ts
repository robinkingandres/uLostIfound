import type { Report, ReportStatus, ReportType } from '../types/report';
import type { Claim, ClaimStatus } from '../types/claim'; // Ensure Claim/ClaimStatus are imported
// FIX: Ensure correct import of fetchCsrfToken from authApi.ts
import { fetchCsrfToken } from './authApi'; 

export type { Report };

const API_URL = 'http://localhost:8000/api'; // <-- FIXED HOSTNAME
const REPORT_URL = `${API_URL}/reports/`;
const CLAIM_URL = `${API_URL}/claims/`; // <-- NEW CLAIM URL
const USER_URL = `${API_URL}/users/`;
const DASHBOARD_STATS_URL = `${API_URL}/dashboard/stats/`; // <-- NEW URL

// --- Utility: Map Backend User Data to Frontend Format ---
const mapUser = (data: any) => ({
  ...data,
  // Ensure camelCase for frontend components even if backend sends snake_case
  yearLevel: data.year_level || data.yearLevel,
  userId: data.school_id || data.userId, 
});

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
    const detail = errorData?.detail || errorData?.non_field_errors?.[0] || 'Failed to submit claim';
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(errorData));
  }

  return response.json();
};

// --- NEW: Fetch all claims (Admin sees all, User sees own) ---
export const fetchClaims = async (reportId?: number): Promise<Claim[]> => {
  let url = CLAIM_URL;
  if (reportId !== undefined) {
    url += `?report_id=${reportId}`;
  }
  // Authentication is required, include credentials
  const response = await fetch(url, {
    credentials: 'include' 
  });

  if (!response.ok) {
    throw new Error('Failed to fetch claims');
  }
  const data = await response.json();
  if (Array.isArray(data)) return data;
  if (data?.results && Array.isArray(data.results)) return data.results;
  return [];
};

// --- Claimant can edit proof details while claim is pending ---
export const updateClaimProof = async (
  claimId: number,
  proofDescription: string,
  proofImage?: File | null
): Promise<Claim> => {
  const csrfToken = await fetchCsrfToken();
  if (!csrfToken) throw new Error('CSRF token not found. Please ensure you are logged in.');

  const formData = new FormData();
  formData.append('proofDescription', proofDescription);
  if (proofImage) {
    formData.append('proofImage', proofImage);
  }

  const response = await fetch(`${CLAIM_URL}${claimId}/`, {
    method: 'PATCH',
    headers: { 'X-CSRFToken': csrfToken },
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json();
    const detail = errorData?.detail || errorData?.non_field_errors?.[0] || 'Failed to update claim proof';
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(errorData));
  }
  return response.json();
};

// --- NEW: Update claim status (Approve/Reject) ---
export const updateClaimStatus = async (
  id: number, 
  status: ClaimStatus, 
  rejectionReason?: string
): Promise<Claim> => {
  const csrfToken = await fetchCsrfToken();
  if (!csrfToken) throw new Error('CSRF token not found. Please ensure you are logged in.');

  const response = await fetch(`${CLAIM_URL}${id}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken,
    },
    // Include rejection_reason in the body if it exists
    body: JSON.stringify({ 
      status,
      rejection_reason: rejectionReason 
    }),
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
  const normalizedType = (type ?? '').toString().trim().toLowerCase();
  const normalizedStatus = (status ?? '').toString().trim().toLowerCase();

  if (normalizedType && normalizedType !== 'all') params.append('type', type as string);
  if (normalizedStatus && normalizedStatus !== 'all') params.append('status', status as string);

  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  // Credentials must be included even for GET to maintain session/authentication checks
  const response = await fetch(url, {
    credentials: 'include',
    cache: 'no-store',
  }); 
  
  if (!response.ok) {
    throw new Error('Failed to fetch reports');
  }
  const data = await response.json();
  if (Array.isArray(data)) return data;
  if (data?.results && Array.isArray(data.results)) return data.results;
  return [];
};


/**
 * Updates an existing report (User: own Pending only; Admin: any).
 */
export const updateReport = async (id: number, data: Partial<ReportPayload>, imageFile?: File | null): Promise<Report> => {
  const csrfToken = await fetchCsrfToken();
  if (!csrfToken) throw new Error('CSRF token not found. Please ensure you are logged in.');

  let body: FormData | string;
  const headers: Record<string, string> = { 'X-CSRFToken': csrfToken };

  if (imageFile) {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });
    formData.append('image', imageFile);
    body = formData;
    // Don't set Content-Type for FormData - browser sets it with boundary
  } else {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(data);
  }

  const response = await fetch(`${REPORT_URL}${id}/`, {
    method: 'PATCH',
    headers,
    body,
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(JSON.stringify(errorData));
  }
  return response.json();
};

/**
 * Deletes a report (User: own Pending only; Admin: any).
 */
export const deleteReport = async (id: number): Promise<void> => {
  const csrfToken = await fetchCsrfToken();
  if (!csrfToken) throw new Error('CSRF token not found. Please ensure you are logged in.');

  const response = await fetch(`${REPORT_URL}${id}/`, {
    method: 'DELETE',
    headers: { 'X-CSRFToken': csrfToken },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(JSON.stringify(errorData));
  }
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
export const createUser = async (data: {
  username: string;
  email: string;
  school_id: string;
  role: string;
  password: string;
  year_level?: string;
  room?: string;
}) => {
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
export const updateProfile = async (
  userId: number,
  data: {
    first_name?: string;
    last_name?: string;
    email?: string;
    year_level?: string;
    room?: string;
    gender?: string;
  }
): Promise<any> => {
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

  const result = await response.json();
  return mapUser(result);
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

  const data = await response.json();
  return mapUser(data);
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

  const result = await response.json();
  return mapUser(result);
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
  const data = await response.json();
  if (Array.isArray(data)) return data;
  if (data?.results && Array.isArray(data.results)) return data.results;
  return [];
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
export const triggerAIScan = async (minScore?: number): Promise<{ status: string; message: string; matches_created: number }> => {
  const csrfToken = await fetchCsrfToken();
  if (!csrfToken) throw new Error('CSRF token not found. Please ensure you are logged in.');
  const scanEndpoints = [`${API_URL}/admin/ai/scan/`, `${AI_MATCH_URL}scan_all/`, `${API_URL}/ai/scan/`];
  let lastError = '';

  for (const endpoint of scanEndpoints) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
      },
      body: JSON.stringify(minScore === undefined ? {} : { min_score: minScore }),
      credentials: 'include',
    });

    if (response.ok) return response.json();

    const errorText = await response.text();
    lastError = errorText || `HTTP ${response.status}`;

    // Try fallback only when endpoint is not available.
    if (![404, 405].includes(response.status)) break;
  }
  throw new Error(lastError || 'Failed to trigger AI scan');
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

export interface AdminAnalyticsResponse {
  filters: {
    date_from: string;
    date_to: string;
    category: string;
    timeframe?: 'week' | 'month' | 'year';
    metrics?: string[];
  };
  kpis: {
    total_reports: number;
    reports_today: number;
    claims_submitted: number;
    claims_today: number;
    claims_resolved: number;
    resolution_rate: number;
    ai_matches_generated: number;
    ai_matches_today: number;
    avg_resolution_time_days: number;
    pending_claims: number;
    overdue_claims: number;
  };
  trends: Array<{ month: string; lost: number; found: number; claims: number; ai: number }>;
  due_claims_monthly: Array<{ month: string; count: number }>;
  pending_claims_monthly: Array<{ month: string; count: number }>;
  categories: Array<{ name: string; count: number }>;
  status_breakdown: Record<string, number>;
  locations: Array<{ name: string; count: number }>;
}

export interface AdminAnalyticsExportRow {
  date_reported: string;
  record_type: 'Lost' | 'Found';
  report_id: number;
  item_name: string;
  category: string;
  location: string;
  report_status: string;
  report_description: string;
  item_image_url: string;
  reporter_name: string;
  reporter_school_id: string;
  reporter_role: string;
  reporter_email: string;
  claim_id: number | '';
  claim_status: string;
  claimed_at: string;
  claimant_name: string;
  claimant_school_id: string;
  claimant_email: string;
  claim_proof_image_url: string;
}

export interface AdminAnalyticsExportResponse {
  filters: {
    date_from: string;
    date_to: string;
    category: string;
    timeframe: 'week' | 'month' | 'year';
  };
  rows: AdminAnalyticsExportRow[];
}

const ADMIN_ANALYTICS_URL = `${API_URL}/admin/analytics/`;
const ADMIN_ANALYTICS_EXPORT_DATA_URL = `${API_URL}/admin/analytics/export-data/`;

export const fetchAdminAnalytics = async (params?: {
  date_from?: string;
  date_to?: string;
  category?: string;
  timeframe?: 'week' | 'month' | 'year';
  metrics?: string[];
}): Promise<AdminAnalyticsResponse> => {
  const csrfToken = await fetchCsrfToken();
  if (!csrfToken) throw new Error('Authentication required');

  const url = new URL(ADMIN_ANALYTICS_URL, window.location.origin);
  if (params?.date_from) url.searchParams.set('date_from', params.date_from);
  if (params?.date_to) url.searchParams.set('date_to', params.date_to);
  if (params?.category) url.searchParams.set('category', params.category);
  if (params?.timeframe) url.searchParams.set('timeframe', params.timeframe);
  if (params?.metrics?.length) url.searchParams.set('metrics', params.metrics.join(','));

  const response = await fetch(url.toString(), {
    credentials: 'include',
    headers: { 'X-CSRFToken': csrfToken },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch admin analytics');
  }
  return response.json();
};

export const fetchAdminAnalyticsExportData = async (params?: {
  date_from?: string;
  date_to?: string;
  category?: string;
  timeframe?: 'week' | 'month' | 'year';
}): Promise<AdminAnalyticsExportResponse> => {
  const csrfToken = await fetchCsrfToken();
  if (!csrfToken) throw new Error('Authentication required');

  const url = new URL(ADMIN_ANALYTICS_EXPORT_DATA_URL, window.location.origin);
  if (params?.date_from) url.searchParams.set('date_from', params.date_from);
  if (params?.date_to) url.searchParams.set('date_to', params.date_to);
  if (params?.category) url.searchParams.set('category', params.category);
  if (params?.timeframe) url.searchParams.set('timeframe', params.timeframe);

  const response = await fetch(url.toString(), {
    credentials: 'include',
    headers: { 'X-CSRFToken': csrfToken },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch export data');
  }
  return response.json();
};

export interface SettingsCategory {
  id: number;
  name: string;
  sort_order: number;
  is_active: boolean;
}

export interface SiteSettings {
  id: number;
  org_name: string;
  org_tagline: string;
  org_logo: string | null;
  org_logo_url: string | null;
  default_new_report_status: 'Pending' | 'Verified' | 'Claimed' | 'Rejected';
  home_visible_report_statuses: string[];
  claim_require_proof_image: boolean;
  ai_min_score: number;
  ai_matching_enabled: boolean;
  user_home_chatbot_visible: boolean;
  user_home_chat_notification_dot: boolean;
  email_master_enabled: boolean;
  email_notify_verified_reports: boolean;
  email_notify_claim_results: boolean;
  categories: SettingsCategory[];
  updated_at: string;
}

const SETTINGS_URL = `${API_URL}/settings/`;
const SETTINGS_CATEGORIES_PATCH_URL = `${API_URL}/settings/categories/`;
const SETTINGS_AI_THRESHOLD_URL = `${API_URL}/settings/ai-threshold/`;
const SETTINGS_CATEGORIES_URL = `${API_URL}/categories/`;

export const fetchSiteSettings = async (): Promise<SiteSettings> => {
  const response = await fetch(SETTINGS_URL, { credentials: 'include' });
  if (!response.ok) {
    throw new Error('Failed to fetch settings');
  }
  return response.json();
};

export const updateSiteSettings = async (payload: Partial<SiteSettings> | FormData): Promise<SiteSettings> => {
  const csrfToken = await fetchCsrfToken();
  if (!csrfToken) throw new Error('Authentication required');

  const isForm = payload instanceof FormData;
  const response = await fetch(SETTINGS_URL, {
    method: 'PATCH',
    credentials: 'include',
    headers: isForm ? { 'X-CSRFToken': csrfToken } : {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken,
    },
    body: isForm ? payload : JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error('Failed to update settings');
  }
  return response.json();
};

export const patchSettingsCategories = async (categories: SettingsCategory[]): Promise<SettingsCategory[]> => {
  const csrfToken = await fetchCsrfToken();
  if (!csrfToken) throw new Error('Authentication required');

  const response = await fetch(SETTINGS_CATEGORIES_PATCH_URL, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken,
    },
    body: JSON.stringify({ categories }),
  });
  if (!response.ok) {
    throw new Error('Failed to save categories');
  }
  const data = await response.json();
  if (Array.isArray(data)) return data;
  if (data?.results && Array.isArray(data.results)) return data.results;
  return [];
};

export const updateAiThreshold = async (minScore: number): Promise<SiteSettings> => {
  const csrfToken = await fetchCsrfToken();
  if (!csrfToken) throw new Error('Authentication required');

  const response = await fetch(SETTINGS_AI_THRESHOLD_URL, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken,
    },
    body: JSON.stringify({ min_score: minScore }),
  });

  if (!response.ok) {
    throw new Error('Failed to update AI threshold');
  }
  return response.json();
};

export const fetchSettingsCategories = async (): Promise<SettingsCategory[]> => {
  const response = await fetch(SETTINGS_CATEGORIES_URL, { credentials: 'include' });
  if (!response.ok) {
    throw new Error('Failed to fetch categories');
  }
  const data = await response.json();
  if (Array.isArray(data)) return data;
  if (data?.results && Array.isArray(data.results)) return data.results;
  return [];
};

export const createSettingsCategory = async (payload: Pick<SettingsCategory, 'name' | 'sort_order' | 'is_active'>): Promise<SettingsCategory> => {
  const csrfToken = await fetchCsrfToken();
  if (!csrfToken) throw new Error('Authentication required');
  const response = await fetch(SETTINGS_CATEGORIES_URL, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to create category');
  return response.json();
};

export const updateSettingsCategory = async (id: number, payload: Partial<SettingsCategory>): Promise<SettingsCategory> => {
  const csrfToken = await fetchCsrfToken();
  if (!csrfToken) throw new Error('Authentication required');
  const response = await fetch(`${SETTINGS_CATEGORIES_URL}${id}/`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to update category');
  return response.json();
};

export const deleteSettingsCategory = async (id: number): Promise<void> => {
  const csrfToken = await fetchCsrfToken();
  if (!csrfToken) throw new Error('Authentication required');
  const response = await fetch(`${SETTINGS_CATEGORIES_URL}${id}/`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'X-CSRFToken': csrfToken },
  });
  if (!response.ok) throw new Error('Failed to delete category');
};
