#!/usr/bin/env node

const esbuild = require("esbuild");
const path = require("path");
const fs = require("fs-extra");

const isDev = process.argv.includes("--dev");
const isWatch = process.argv.includes("--watch");

async function build() {
  // Clean build directory
  await fs.emptyDir("build");
  
  // Copy addon files
  await fs.copy("addon", "build", {
    filter: (src) => !src.includes(".DS_Store"),
  });
  
  // Copy defaults folder if it exists
  if (await fs.pathExists("defaults")) {
    await fs.copy("defaults", "build/defaults", {
      filter: (src) => !src.includes(".DS_Store"),
    });
  }
  
  // Build configuration
  const buildOptions = {
    entryPoints: ["src/index.ts"],
    bundle: true,
    outfile: "build/index.js",
    format: "iife",
    platform: "browser",
    target: "firefox102",
    external: [
      "zotero",
      "zotero/*",
      "chrome",
      "chrome/*",
      "Components",
      "Components/*",
      "Services",
      "Services/*",
    ],
    globalName: "Zotero2ReadwisePlugin",
    define: {
      __ENV__: isDev ? '"development"' : '"production"',
    },
    sourcemap: isDev,
    minify: !isDev,
    logLevel: "info",
  };
  
  if (isWatch) {
    // Watch mode
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log("Watching for changes...");
  } else {
    // Single build
    await esbuild.build(buildOptions);
    console.log("Build completed!");
    
    // Create XPI if not in dev mode
    if (!isDev) {
      await createXPI();
    }
  }
}

async function createXPI() {
  const archiver = require("archiver");
  const output = fs.createWriteStream("zotero2readwise.xpi");
  const archive = archiver("zip", { zlib: { level: 9 } });
  
  output.on("close", () => {
    console.log(`XPI created: ${archive.pointer()} bytes`);
  });
  
  archive.on("error", (err) => {
    throw err;
  });
  
  archive.pipe(output);
  archive.directory("build/", false);
  await archive.finalize();
}

// Run build
build().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
