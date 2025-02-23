// supabase.js (ES Modules)
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lrfbyomtntbwgvjbelnj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyZmJ5b210bnRid2d2amJlbG5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk3OTk5NTQsImV4cCI6MjA1NTM3NTk1NH0.-qb3Ijvf3ET8VdFp4l05Tjikz-Q9tZdQiujrswtRXsI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
