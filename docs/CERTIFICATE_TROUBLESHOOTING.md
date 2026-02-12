# TLS / Certificate Troubleshooting

If you see **"unable to get local issuer certificate"** when running `npm start`, Vercel deploy, or other HTTPS requests, Node.js cannot verify TLS certificates (often due to corporate proxy, VPN, or Node install).

## Quick workaround (local dev only)

```bash
npm run start:no-ssl-check
```

This runs Expo with `NODE_TLS_REJECT_UNAUTHORIZED=0`. **Use only for local development** — it disables certificate verification and is insecure.

For Vercel from the same environment:

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npx vercel --prod
```

## Proper fixes

1. **macOS:** Reinstall Node via Homebrew so it uses system certificates:  
   `brew reinstall node`
2. **Corporate proxy:** Ask IT for the proxy CA certificate, then set:  
   `export NODE_EXTRA_CA_CERTS=/path/to/corporate-ca.pem`
3. **nvm / direct Node install:** Ensure the `cacert` bundle is available and, if needed, set `NODE_OPTIONS=--use-openssl-ca` (or install certs for your Node version).
