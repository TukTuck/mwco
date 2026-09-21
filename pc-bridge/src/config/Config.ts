/**
 * Configuration für die PC-Bridge.
 *
 * Wird geladen aus config/default.json, überschreibbar mit config/local.json.
 * Sensible Daten (Auth-Token) sollten in local.json stehen (nicht im Git).
 */

import fs from 'node:fs';
import path from 'node:path';

export interface BridgeConfig {
  server: {
    port: number;
    host: string;
    maxConnections: number;
  };
  security: {
    requireAuth: boolean;
    authToken: string;
    allowedPaths: string[];
    blockedPaths: string[];
    allowShellExecution: boolean;
    maxOutputSize: number;
    executionTimeout: number;
  };
  discovery: {
    mdns: boolean;
    serviceName: string;
    serviceType: string;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    file: string;
  };
  workspace: {
    defaultPath: string;
    autoDetectGit: boolean;
  };
}

const CONFIG_DIR = path.resolve(import.meta.dirname, '../../config');

/**
 * Lädt die Konfiguration: default.json + local.json (override).
 */
export function loadConfig(): BridgeConfig {
  const defaultConfig = loadJsonFile(path.join(CONFIG_DIR, 'default.json'));
  const localConfig = loadJsonFile(path.join(CONFIG_DIR, 'local.json'));

  return deepMerge(defaultConfig, localConfig) as BridgeConfig;
}

function loadJsonFile(filePath: string): Record<string, unknown> {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    const targetVal = target[key];
    const sourceVal = source[key];

    if (
      targetVal &&
      sourceVal &&
      typeof targetVal === 'object' &&
      typeof sourceVal === 'object' &&
      !Array.isArray(targetVal)
    ) {
      result[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>
      );
    } else {
      result[key] = sourceVal;
    }
  }

  return result;
}
