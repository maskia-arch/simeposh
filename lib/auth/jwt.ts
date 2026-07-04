const encoder = new TextEncoder();

function base64UrlEncode(str: string): string {
  const bytes = encoder.encode(str);
  let binString = '';
  for (let i = 0; i < bytes.length; i++) {
    binString += String.fromCharCode(bytes[i]);
  }
  return btoa(binString)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binString = atob(base64);
  const buffer = new ArrayBuffer(binString.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binString.length; i++) {
    bytes[i] = binString.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

// Convert base64url string to strict ArrayBuffer-backed Uint8Array
function base64UrlToUint8Array(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binString = atob(base64);
  const buffer = new ArrayBuffer(binString.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binString.length; i++) {
    bytes[i] = binString.charCodeAt(i);
  }
  return bytes;
}

// Helper to import the secret key into CryptoKey format
async function getCryptoKey(secret: string): Promise<CryptoKey> {
  const keyData = encoder.encode(secret);
  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signJwt(payload: object, expiresInSeconds = 7 * 24 * 3600): Promise<string> {
  const secret = process.env.JWT_SECRET || 'fallback-secure-secret-please-set-in-env-min-32-chars';
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const fullPayload = { ...payload, exp };
  
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const key = await getCryptoKey(secret);
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signatureInput)
  );
  
  // Convert signature to base64url
  const signatureBytes = new Uint8Array(signatureBuffer);
  let binString = '';
  for (let i = 0; i < signatureBytes.byteLength; i++) {
    binString += String.fromCharCode(signatureBytes[i]);
  }
  const signature = btoa(binString)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  
  return `${signatureInput}.${signature}`;
}

export async function verifyJwt(token: string): Promise<any | null> {
  try {
    const secret = process.env.JWT_SECRET || 'fallback-secure-secret-please-set-in-env-min-32-chars';
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [header, payload, signature] = parts;
    const signatureInput = `${header}.${payload}`;
    
    const key = await getCryptoKey(secret);
    const signatureBytes = base64UrlToUint8Array(signature);
    
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes as any,
      encoder.encode(signatureInput)
    );
    
    if (!isValid) return null;
    
    const decodedPayload = JSON.parse(base64UrlDecode(payload));
    if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }
    return decodedPayload;
  } catch {
    return null;
  }
}
