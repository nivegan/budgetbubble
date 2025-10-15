import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './supabase/info';

/**
 * Singleton Supabase client for frontend authentication
 */
export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

/**
 * Sign up a new user
 */
export async function signUp(email: string, password: string, name: string) {
  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-ecf79a0e/auth/signup`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ email, password, name }),
    }
  );

  return await response.json();
}

/**
 * Sign in an existing user
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  return { 
    accessToken: data.session?.access_token,
    user: data.user,
  };
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Get the current session
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  
  if (error || !data.session) {
    return { session: null, error };
  }

  return { 
    session: data.session,
    accessToken: data.session.access_token,
    user: data.session.user,
  };
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const { session } = await getSession();
  return !!session;
}
