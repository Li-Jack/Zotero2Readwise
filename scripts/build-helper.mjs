#!/usr/bin/env node

/**
 * Build helper script for the Z2R plugin
 * Provides utilities for build process
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

/**
 * Clean build artifacts
 */
export function clean() {
  console.log("🧹 Cleaning build artifacts...");
  const dirsToClean = [".scaffold", "build", "dist"];
  const filesToClean = ["*.xpi", "*.log", "tsconfig.tsbuildinfo"];

  dirsToClean.forEach((dir) => {
    const fullPath = path.join(rootDir, dir);
    if (fs.existsSync(fullPath)) {
      fs.rmSync(fullPath, { recursive: true, force: true });
      console.log(`  ✓ Removed ${dir}`);
    }
  });

  filesToClean.forEach((pattern) => {
    const files = fs
      .readdirSync(rootDir)
      .filter((file) => file.match(new RegExp(pattern.replace("*", ".*"))));
    files.forEach((file) => {
      fs.unlinkSync(path.join(rootDir, file));
      console.log(`  ✓ Removed ${file}`);
    });
  });
}

/**
 * Run type checking
 */
export function typecheck() {
  console.log("🔍 Running TypeScript type checking...");
  try {
    execSync("npx tsc --noEmit", { stdio: "inherit", cwd: rootDir });
    console.log("✅ Type checking passed!");
  } catch (error) {
    console.error("❌ Type checking failed!");
    process.exit(1);
  }
}

/**
 * Get build info
 */
export function getBuildInfo() {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(rootDir, "package.json"), "utf-8")
  );

  return {
    version: packageJson.version,
    name: packageJson.config.addonName,
    id: packageJson.config.addonID,
    buildTime: new Date().toISOString(),
    environment: process.env.NODE_ENV || "production",
  };
}

/**
 * Display build info
 */
export function displayBuildInfo() {
  const info = getBuildInfo();
  console.log("\n📦 Build Information:");
  console.log(`  Name: ${info.name}`);
  console.log(`  Version: ${info.version}`);
  console.log(`  ID: ${info.id}`);
  console.log(`  Environment: ${info.environment}`);
  console.log(`  Build Time: ${info.buildTime}\n`);
}

// Run if called directly
if (process.argv[1] === __filename) {
  const command = process.argv[2];

  switch (command) {
    case "clean":
      clean();
      break;
    case "typecheck":
      typecheck();
      break;
    case "info":
      displayBuildInfo();
      break;
    default:
      console.log("Available commands: clean, typecheck, info");
  }
}
