import { createClient } from '@supabase/supabase-js';
import { SVELTE_PUBLIC_SUPABASE_URL, SVELTE_PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

// Initialize the Supabase client
export const supabase = createClient(SVELTE_PUBLIC_SUPABASE_URL, SVELTE_PUBLIC_SUPABASE_ANON_KEY);
