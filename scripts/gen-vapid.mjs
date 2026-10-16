// Genera las claves VAPID para las notificaciones push.
// Uso: npm run vapid
const { subtle } = globalThis.crypto;
const kp = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const raw = Buffer.from(await subtle.exportKey('raw', kp.publicKey)).toString('base64url');
const jwk = await subtle.exportKey('jwk', kp.privateKey);
delete jwk.key_ops;
delete jwk.ext;
console.log('\nVAPID_PUBLIC_KEY (va en wrangler.jsonc > vars):\n' + raw);
console.log('\nVAPID_PRIVATE_JWK (secreto: npx wrangler secret put VAPID_PRIVATE_JWK):\n' + JSON.stringify(jwk) + '\n');
