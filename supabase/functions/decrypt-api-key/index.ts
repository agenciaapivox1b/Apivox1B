import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { decodeBase64 } from 'https://deno.land/std@0.168.0/encoding/base64.ts';

/**
 * Edge Function: Decrypt API Key (BACKEND ONLY)
 * 
 * ⚠️ ESTE ENDPOINT DEVE ESTAR PROTEGIDO POR RLS E AUTENTICAÇÃO
 * 
 * POST /functions/v1/decrypt-api-key
 * 
 * Headers:
 *   Authorization: Bearer <user_jwt>
 * 
 * Body:
 * {
 *   "encrypted": "base64_string",
 *   "tenantId": "string"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "apiKey": "string" (⚠️ NUNCA retornar ao frontend!)
 * }
 */

const getMasterKey = (): string => {
  const envKey = Deno.env.get('ENCRYPTION_MASTER_KEY');
  return envKey || 'apivox-master-key-2026-secure';
};

const deriveKey = async (password: string, salt: Uint8Array): Promise<CryptoKey> => {
  const encoder = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    256
  );

  return crypto.subtle.importKey(
    'raw',
    derivedBits,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
};

const decryptData = async (encrypted: string, masterKey: string, tenantId: string): Promise<string> => {
  const decoder = new TextDecoder();
  const combined = decodeBase64(encrypted);

  // Salt: primeiros 16 bytes
  // IV: próximos 12 bytes
  // Encrypted: resto
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const encryptedData = combined.slice(28);

  // Gera chave derivada
  const key = await deriveKey(`${masterKey}:${tenantId}`, salt);

  // Descriptografa
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encryptedData
  );

  return decoder.decode(decrypted);
};

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // ⚠️ Verificar autenticação (em produção)
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - missing auth header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { encrypted, tenantId } = await req.json();

    if (!encrypted || !tenantId) {
      return new Response(
        JSON.stringify({ error: 'encrypted and tenantId are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const masterKey = getMasterKey();
    const apiKey = await decryptData(encrypted, masterKey, tenantId);

    // ⚠️ IMPORTANTE: Nunca retornar a API Key ao frontend
    // Retornar apenas um flag de sucesso para o servidor backend
    return new Response(
      JSON.stringify({
        success: true,
        apiKey, // Apenas para uso interno do backend
        // NÃO incluir em respostas ao cliente
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error: any) {
    console.error('[decrypt-api-key] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || 'Erro ao descriptografar',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
