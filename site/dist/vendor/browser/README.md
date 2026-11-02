# Browser tool dependencies

Locally bundled; no external scripts or runtime package installation.

Rebuild the tools.mjs ES module with esbuild from:

export { toCanvas } from 'html-to-image';
export { default as QRCode } from 'qrcode';
export { default as jsQR } from 'jsqr';

html-to-image 1.11.13
qrcode 1.5.4
jsqr 1.4.0

Build flags: --bundle --platform=browser --format=esm --minify --legal-comments=inline
esbuild 0.28.2

Transitive bundled dependency: dijkstrajs 1.0.3 (license included).
