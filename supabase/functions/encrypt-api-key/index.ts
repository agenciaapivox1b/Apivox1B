import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { encodeBase64 } from 'https://deno.land/std@0.168.0/encoding/base64.ts';

/**
 * Edge Function: Encrypt API Key
 * 
 * POST /functions/v1/encrypt-api-key
 * 
 * Body:
 * {
 *   "apiKey": "string",
 *   "tenantId": "string"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "encrypted": "base64_encrypted_string"
 * }
 */

// Master key (em produção, usar variável de ambiente)
const getMasterKey = (): string => {
  const envKey = Deno.env.get('ENCRYPTION_MASTER_KEY');
  return envKey || 'apivox-master-key-2026-secure';
};

// Função auxiliar para gerar array de bytes aleatórios
const getRandomBytes = (length: number): Uint8Array => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return array;
};

// Converte array de bytes para hex string
const bytesToHex = (bytes: Uint8Array): string => {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

// Converte hex string para array de bytes
const hexToBytes = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
};

// Gera chave a partir de salt via PBKDF2
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

// Criptografa string usando AES-GCM
const encryptData = async (plainText: string, masterKey: string, tenantId: string): Promise<string> => {
  const encoder = new TextEncoder();
  const salt = getRandomBytes(16);
  const iv = getRandomBytes(12);

  // Gera chave derivada
  const key = await deriveKey(`${masterKey}:${tenantId}`, salt);

  // Criptografa
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plainText)
  );

  // Combina: salt + iv + encrypted em base64
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);

  return encodeBase64(combined);
};

serve(async (req) => {
  // CORS headers
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
    const { apiKey, tenantId } = await req.json();

    if (!apiKey || !tenantId) {
      return new Response(
        JSON.stringify({ error: 'apiKey and tenantId are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const masterKey = getMasterKey();
    const encrypted = await encryptData(apiKey, masterKey, tenantId);

    return new Response(
      JSON.stringify({
        success: true,
        encrypted,
        encryptedApiKey: encrypted,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error: any) {
    console.error('[encrypt-api-key] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || 'Erro ao criptografar',
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
