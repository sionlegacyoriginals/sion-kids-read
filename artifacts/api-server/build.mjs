import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";
import { rm, cp, mkdir } from "node:fs/promises";

// Plugins (e.g. 'esbuild-plugin-pino') may use `require` to resolve dependencies
globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));

async function buildAll() {
  const distDir = path.resolve(artifactDir, "dist");
  await rm(distDir, { recursive: true, force: true });

  await esbuild({
    entryPoints: [path.resolve(artifactDir, "src/index.ts")],
    platform: "node",
    bundle: true,
    format: "esm",
    outdir: distDir,
    outExtension: { ".js": ".mjs" },
    logLevel: "info",
    // Some packages may not be bundleable, so we externalize them, we can add more here as needed.
    // Some of the packages below may not be imported or installed, but we're adding them in case they are in the future.
    // Examples of unbundleable packages:
    // - uses native modules and loads them dynamically (e.g. sharp)
    // - use path traversal to read files (e.g. @google-cloud/secret-manager loads sibling .proto files)
    external: [
      "*.node",
      "sharp",
      "better-sqlite3",
      "sqlite3",
      "canvas",
      "bcrypt",
      "argon2",
      "fsevents",
      "re2",
      "farmhash",
      "xxhash-addon",
      "bufferutil",
      "utf-8-validate",
      "ssh2",
      "cpu-features",
      "dtrace-provider",
      "isolated-vm",
      "lightningcss",
      "pg-native",
      "oracledb",
      "mongodb-client-encryption",
      "nodemailer",
      "handlebars",
      "knex",
      "typeorm",
      "protobufjs",
      "onnxruntime-node",
      "@tensorflow/*",
      "@prisma/client",
      "@mikro-orm/*",
      "@grpc/*",
      // "@swc/*" intentionally NOT externalized — pdfkit → fontkit requires @swc/helpers at runtime
      "@aws-sdk/*",
      "@azure/*",
      "@opentelemetry/*",
      "@google-cloud/*",
      "@google/*",
      "googleapis",
      "firebase-admin",
      "@parcel/watcher",
      "@sentry/profiling-node",
      "@tree-sitter/*",
      "aws-sdk",
      "classic-level",
      "dd-trace",
      "ffi-napi",
      "grpc",
      "hiredis",
      "kerberos",
      "leveldown",
      "miniflare",
      "mysql2",
      "newrelic",
      "odbc",
      "piscina",
      "realm",
      "ref-napi",
      "rocksdb",
      "sass-embedded",
      "sequelize",
      "serialport",
      "snappy",
      "tinypool",
      "usb",
      "workerd",
      "wrangler",
      "zeromq",
      "zeromq-prebuilt",
      "playwright",
      "puppeteer",
      "puppeteer-core",
      "electron",
    ],
    sourcemap: "linked",
    plugins: [
      // pino relies on workers to handle logging, instead of externalizing it we use a plugin to handle it
      esbuildPluginPino({ transports: ["pino-pretty"] })
    ],
    // Make sure packages that are cjs only (e.g. express) but are bundled continue to work in our esm output file
    banner: {
      js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';

globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
    `,
    },
  });
  await copyPdfkitData();
  await copyAvatars();
}

async function copyAvatars() {
  // Avatar PNGs live at repo-root/attached_assets/avatars/.
  // Copy them into dist/avatars/ so the production server can seed the DB on startup.
  const workspaceRoot = path.resolve(artifactDir, "../..");
  const src = path.resolve(workspaceRoot, "attached_assets/avatars");
  const dest = path.resolve(artifactDir, "dist/avatars");
  try {
    await mkdir(dest, { recursive: true });
    await cp(src, dest, { recursive: true });
    console.log("✓ Copied avatar images → dist/avatars");
  } catch {
    console.warn("⚠️  attached_assets/avatars not found — skipping avatar copy");
  }
}

async function copyPdfkitData() {
  // pdfkit loads font/ICC files from the filesystem relative to __dirname.
  // When bundled, __dirname = dist/, so copy pdfkit's data dir there.
  const src = path.resolve(artifactDir, "node_modules/pdfkit/js/data");
  const dest = path.resolve(artifactDir, "dist/data");
  await mkdir(dest, { recursive: true });
  await cp(src, dest, { recursive: true });
  console.log("✓ Copied pdfkit font data → dist/data");

  // Copy embedded TTF fonts (required so Lulu accepts PDFs with embedded fonts)
  const fontSrc = path.resolve(artifactDir, "fonts");
  const fontDest = path.resolve(artifactDir, "dist/fonts");
  await mkdir(fontDest, { recursive: true });
  await cp(fontSrc, fontDest, { recursive: true });
  console.log("✓ Copied embedded fonts → dist/fonts");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
