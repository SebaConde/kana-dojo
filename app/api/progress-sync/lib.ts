import { createHash } from 'crypto';

export const PROGRESS_SYNC_TTL_SECONDS = 60 * 60 * 24 * 365; // 365 days
export const MAX_SYNC_PAYLOAD_BYTES = 512 * 1024; // 512 KB

const MIN_SYNC_KEY_LENGTH = 16;
const MAX_SYNC_KEY_LENGTH = 128;
const SYNC_KEY_PATTERN = /^[A-Za-z0-9_:.=-]+$/;
const ISO_8601_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

export interface ProgressSnapshot {
  version: string;
  createdAt: string;
  theme?: Record<string, unknown>;
  customTheme?: Record<string, unknown>;
  stats?: Record<string, unknown>;
}

export interface ProgressSyncRequestBody {
  updatedAt: string;
  snapshot: ProgressSnapshot;
}

export interface ProgressSyncRecord extends ProgressSyncRequestBody {
  schemaVersion: 1;
  serverUpdatedAt: string;
  updatedAtMs?: number;
}

type ValidationErrorCode = 'INVALID_PAYLOAD' | 'PAYLOAD_TOO_LARGE';

interface ValidationError {
  code: ValidationErrorCode;
  message: string;
}

interface ValidationSuccess {
  ok: true;
  value: ProgressSyncRequestBody;
}

interface ValidationFailure {
  ok: false;
  error: ValidationError;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseIsoDateMs(value: unknown): number | null {
  if (typeof value !== 'string' || !ISO_8601_PATTERN.test(value)) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isValidIsoDate(value: unknown): value is string {
  return parseIsoDateMs(value) !== null;
}

function isValidProgressSnapshot(value: unknown): value is ProgressSnapshot {
  if (!isPlainObject(value)) {
    return false;
  }

  if (typeof value.version !== 'string' || value.version.trim().length === 0) {
    return false;
  }

  if (!isValidIsoDate(value.createdAt)) {
    return false;
  }

  const optionalSegments = ['theme', 'customTheme', 'stats'] as const;
  let hasSyncableSegment = false;

  for (const key of optionalSegments) {
    const segment = value[key];
    if (segment === undefined) continue;
    if (!isPlainObject(segment)) {
      return false;
    }
    hasSyncableSegment = true;
  }

  return hasSyncableSegment;
}

function getPayloadByteLength(value: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(value), 'utf-8');
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

export function normalizeSyncKey(rawKey: string | null): string | null {
  if (!rawKey) return null;

  const trimmed = rawKey.trim();
  if (
    trimmed.length < MIN_SYNC_KEY_LENGTH ||
    trimmed.length > MAX_SYNC_KEY_LENGTH
  ) {
    return null;
  }

  if (!SYNC_KEY_PATTERN.test(trimmed)) {
    return null;
  }

  return trimmed;
}

export function buildProgressSyncStorageKey(syncKey: string): string {
  const hash = createHash('sha256').update(syncKey).digest('hex');
  return `progress-sync:${hash}`;
}

export function validateProgressSyncRequestBody(
  body: unknown,
): ValidationResult {
  if (!isPlainObject(body)) {
    return {
      ok: false,
      error: {
        code: 'INVALID_PAYLOAD',
        message: 'Request body must be a JSON object.',
      },
    };
  }

  if (getPayloadByteLength(body) > MAX_SYNC_PAYLOAD_BYTES) {
    return {
      ok: false,
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: `Payload exceeds ${MAX_SYNC_PAYLOAD_BYTES} bytes.`,
      },
    };
  }

  const updatedAtMs = parseIsoDateMs(body.updatedAt);
  if (updatedAtMs === null) {
    return {
      ok: false,
      error: {
        code: 'INVALID_PAYLOAD',
        message: 'updatedAt must be a valid ISO-8601 date string.',
      },
    };
  }

  if (!isValidProgressSnapshot(body.snapshot)) {
    return {
      ok: false,
      error: {
        code: 'INVALID_PAYLOAD',
        message:
          'snapshot must include version, createdAt, and at least one syncable segment.',
      },
    };
  }

  return {
    ok: true,
    value: {
      updatedAt: new Date(updatedAtMs).toISOString(),
      snapshot: body.snapshot,
    },
  };
}

export function isProgressSyncRecord(
  value: unknown,
): value is ProgressSyncRecord {
  if (!isPlainObject(value)) return false;
  if (value.schemaVersion !== 1) return false;
  if (!isValidIsoDate(value.serverUpdatedAt)) return false;
  if (!isValidIsoDate(value.updatedAt)) return false;
  if (!isValidProgressSnapshot(value.snapshot)) return false;
  if (
    value.updatedAtMs !== undefined &&
    (typeof value.updatedAtMs !== 'number' ||
      !Number.isFinite(value.updatedAtMs))
  ) {
    return false;
  }
  return true;
}

export function getProgressUpdatedAtMs(value: {
  updatedAt: string;
  updatedAtMs?: number;
}): number | null {
  if (
    typeof value.updatedAtMs === 'number' &&
    Number.isFinite(value.updatedAtMs)
  ) {
    return value.updatedAtMs;
  }

  return parseIsoDateMs(value.updatedAt);
}

export function shouldAcceptIncomingUpdate(
  existingUpdatedAt: string,
  incomingUpdatedAt: string,
): boolean {
  const existingTs = parseIsoDateMs(existingUpdatedAt);
  const incomingTs = parseIsoDateMs(incomingUpdatedAt);
  if (existingTs === null || incomingTs === null) {
    return false;
  }
  return incomingTs >= existingTs;
}
