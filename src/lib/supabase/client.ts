/**
 * Supabase 클라이언트 초기화
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
      'Please set SUPABASE_URL and SUPABASE_KEY in .env'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
