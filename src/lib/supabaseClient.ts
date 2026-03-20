import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug log to check if environment variables are loaded
if (typeof window !== 'undefined') {
    console.log('--- Configuração Supabase ---');
    console.log('URL:', supabaseUrl ? 'Carregada' : 'AUSENTE');
    console.log('Key:', supabaseAnonKey ? 'Carregada' : 'AUSENTE');
    if (supabaseUrl) console.log('Endpoint:', supabaseUrl);
}

// Fail gracefully instead of crashing the whole app
if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
        'ERRO: Supabase project URL ou Anon Key não encontradas no arquivo .env. ' +
        'Por favor, reinicie seu terminal (npm run dev) após criar o arquivo .env.'
    );
}

// Only try to initialize if we have the URL
export const supabase = createClient(
    supabaseUrl || 'https://placeholder-url.supabase.co',
    supabaseAnonKey || 'placeholder-key'
);
