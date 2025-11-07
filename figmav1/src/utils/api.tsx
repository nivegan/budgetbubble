import { projectId, publicAnonKey } from './supabase/info';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-ecf79a0e`;

/**
 * Helper function to make authenticated API calls
 */
async function apiCall(
  endpoint: string,
  options: RequestInit = {},
  accessToken?: string
) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken || publicAnonKey}`,
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    console.error(`API Error [${endpoint}]:`, data);
    throw new Error(data.error || 'API request failed');
  }

  return data;
}

/**
 * User API calls
 */
export const userAPI = {
  getProfile: (accessToken: string) => 
    apiCall('/user/profile', { method: 'GET' }, accessToken),
  
  updateProfile: (name: string, accessToken: string) =>
    apiCall('/user/profile', {
      method: 'PUT',
      body: JSON.stringify({ name }),
    }, accessToken),
};

/**
 * Household API calls
 */
export const householdAPI = {
  create: (name: string, currency: string, accessToken: string) =>
    apiCall('/households', {
      method: 'POST',
      body: JSON.stringify({ name, currency }),
    }, accessToken),
  
  getMy: (accessToken: string) =>
    apiCall('/households/my', { method: 'GET' }, accessToken),
  
  addMember: (householdId: string, email: string, accessToken: string) =>
    apiCall(`/households/${householdId}/members`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    }, accessToken),
  
  removeMember: (householdId: string, memberId: string, accessToken: string) =>
    apiCall(`/households/${householdId}/members/${memberId}`, {
      method: 'DELETE',
    }, accessToken),
};

/**
 * Transaction API calls
 */
export const transactionAPI = {
  getAll: (householdId: string, personalView: boolean, accessToken: string) =>
    apiCall(`/transactions?householdId=${householdId}&personalView=${personalView}`, {
      method: 'GET',
    }, accessToken),
  
  create: (transaction: any, accessToken: string) =>
    apiCall('/transactions', {
      method: 'POST',
      body: JSON.stringify(transaction),
      smartUpload: async (formData: FormData, token: string, type: 'transactions' | 'holdings') => {
    const endpoint = type === 'transactions'
      ? '/transactions/smart-upload'
      : '/holdings/upload';

    const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/make-server-ecf79a0e${endpoint}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  }
    }, accessToken),
  
  update: (id: string, updates: any, accessToken: string) =>
    apiCall(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
      smartUpload: async (formData: FormData, token: string, type: 'transactions' | 'holdings') => {
    const endpoint = type === 'transactions'
      ? '/transactions/smart-upload'
      : '/holdings/upload';

    const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/make-server-ecf79a0e${endpoint}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  }
    }, accessToken),
  
  delete: (id: string, householdId: string, personalView: boolean, accessToken: string) =>
    apiCall(`/transactions/${id}?householdId=${householdId}&personalView=${personalView}`, {
      method: 'DELETE',
    }, accessToken),
  
  upload: async (file: File, householdId: string, personalView: boolean, mapping: any, skipRows: number, accessToken: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('householdId', householdId);
    formData.append('personalView', String(personalView));
    formData.append('mapping', JSON.stringify(mapping));
    formData.append('skipRows', String(skipRows));

    const response = await fetch(`${API_BASE_URL}/transactions/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Upload error:', data);
      throw new Error(data.error || 'Upload failed');
    }

    return data;
  },
};

/**
 * Template API calls
 */
export const templateAPI = {
  getAll: (accessToken: string) =>
    apiCall('/templates', { method: 'GET' }, accessToken),
  
  create: (name: string, mapping: any, skipRows: number, accessToken: string) =>
    apiCall('/templates', {
      method: 'POST',
      body: JSON.stringify({ name, mapping, skipRows }),
    }, accessToken),
};

/**
 * Pockets API calls (Renamed from goalAPI)
 */
export const goalAPI = {
  getAll: (householdId: string, accessToken: string) =>
    apiCall(`/goals?householdId=${householdId}`, { method: 'GET' }, accessToken),
  
  create: (goal: any, accessToken: string) =>
    apiCall('/goals', {
      method: 'POST',
      body: JSON.stringify(goal),
    }, accessToken),

  update: (goalId: string, updates: any, householdId: string, accessToken: string) =>
    apiCall(`/goals/${goalId}`, {
      method: 'PUT',
      body: JSON.stringify({ ...updates, householdId }),
    }, accessToken),

  delete: (goalId: string, householdId: string, accessToken: string) =>
    apiCall(`/goals/${goalId}?householdId=${householdId}`, { method: 'DELETE' }, accessToken),

  inactivate: (goalId: string, householdId: string, accessToken: string) =>
    apiCall(`/goals/${goalId}/inactive`, { 
      method: 'POST',
      body: JSON.stringify({ householdId }),
    }, accessToken),
};

/**
 * Holdings API calls
 */
export const holdingsAPI = {
  // UPDATED to support personal view
  getAll: (householdId: string, personalView: boolean, accessToken: string) =>
    apiCall(`/holdings?householdId=${householdId}&personalView=${personalView}`, { 
      method: 'GET' 
    }, accessToken),
  
  // UPDATED to support personal flag
  create: (holding: any, accessToken: string) =>
    apiCall('/holdings', {
      method: 'POST',
      body: JSON.stringify(holding),
    }, accessToken),
  
  // UPDATED to support personal view
  update: (id: string, currentValue: number, householdId: string, personalView: boolean, accessToken: string) =>
    apiCall(`/holdings/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ currentValue, householdId, personalView }),
    }, accessToken),
};

