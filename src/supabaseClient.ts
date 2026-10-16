import { createClient } from '@supabase/supabase-js';

// Credenciales directas del proyecto Supabase
const supabaseUrl = 'https://pxcevusvsimbwoquwyra.supabase.co';
const supabaseAnonKey = 'sb_publishable_DFTik619amJZhiloYGed3Q_YWaLukwC'; // Reemplaza esto con tu clave anon / publishable completa

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
