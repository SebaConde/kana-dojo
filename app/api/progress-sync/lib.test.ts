import { describe, expect, it } from 'vitest';
import {
  buildProgressSyncStorageKey,
  getProgressUpdatedAtMs,
  MAX_SYNC_PAYLOAD_BYTES,
  normalizeSyncKey,
  shouldAcceptIncomingUpdate,
  validateProgressSyncRequestBody,
} from './lib';

const validSyncBody = {
  updatedAt: '2026-02-20T12:00:00.000Z',
  snapshot: {
    version: '0.1.14',
    createdAt: '2026-02-20T12:00:00.000Z',
    stats: { totalCorrect: 123 },
  },
};

describe('progress-sync/lib', () => {
  describe('normalizeSyncKey', () => {
    it('trims and accepts valid sync keys', () => {
      expect(normalizeSyncKey('  sync-key-1234567890  ')).toBe(
        'sync-key-1234567890',
      );
    });

    it('rejects invalid sync keys', () => {
      expect(normalizeSyncKey(null)).toBeNull();
      expect(normalizeSyncKey('short')).toBeNull();
      expect(normalizeSyncKey('invalid key with spaces')).toBeNull();
      expect(normalizeSyncKey('!invalid_chars_123456')).toBeNull();
    });
  });

  describe('buildProgressSyncStorageKey', () => {
    it('creates deterministic hashed keys', () => {
      const keyA = buildProgressSyncStorageKey('sync-key-1234567890');
      const keyB = buildProgressSyncStorageKey('sync-key-1234567890');
      const keyC = buildProgressSyncStorageKey('sync-key-abcdefg12345');

      expect(keyA).toBe(keyB);
      expect(keyA).not.toBe(keyC);
      expect(keyA.startsWith('progress-sync:')).toBe(true);
    });
  });

  describe('validateProgressSyncRequestBody', () => {
    it('accepts valid request bodies', () => {
      const result = validateProgressSyncRequestBody(validSyncBody);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.updatedAt).toBe('2026-02-20T12:00:00.000Z');
      }
    });

    it('rejects non-object payloads', () => {
      const result = validateProgressSyncRequestBody('not-an-object');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_PAYLOAD');
      }
    });

    it('rejects invalid date values', () => {
      const result = validateProgressSyncRequestBody({
        ...validSyncBody,
        updatedAt: 'invalid-date',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_PAYLOAD');
      }
    });

    it('rejects snapshots without syncable segments', () => {
      const result = validateProgressSyncRequestBody({
        ...validSyncBody,
        snapshot: {
          version: '0.1.14',
          createdAt: '2026-02-20T12:00:00.000Z',
        },
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_PAYLOAD');
      }
    });

    it('rejects oversized payloads', () => {
      const bigString = 'x'.repeat(MAX_SYNC_PAYLOAD_BYTES + 128);
      const result = validateProgressSyncRequestBody({
        ...validSyncBody,
        snapshot: {
          ...validSyncBody.snapshot,
          stats: {
            blob: bigString,
          },
        },
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('PAYLOAD_TOO_LARGE');
      }
    });
  });

  describe('shouldAcceptIncomingUpdate', () => {
    it('accepts newer or equal updates and rejects older updates', () => {
      expect(
        shouldAcceptIncomingUpdate(
          '2026-02-20T12:00:00.000Z',
          '2026-02-20T12:00:01.000Z',
        ),
      ).toBe(true);
      expect(
        shouldAcceptIncomingUpdate(
          '2026-02-20T12:00:00.000Z',
          '2026-02-20T12:00:00.000Z',
        ),
      ).toBe(true);
      expect(
        shouldAcceptIncomingUpdate(
          '2026-02-20T12:00:01.000Z',
          '2026-02-20T12:00:00.000Z',
        ),
      ).toBe(false);
    });
  });

  describe('getProgressUpdatedAtMs', () => {
    it('prefers updatedAtMs when provided and valid', () => {
      expect(
        getProgressUpdatedAtMs({
          updatedAt: '2026-02-20T12:00:00.000Z',
          updatedAtMs: 1000,
        }),
      ).toBe(1000);
    });

    it('falls back to parsing updatedAt when updatedAtMs is missing', () => {
      expect(
        getProgressUpdatedAtMs({
          updatedAt: '2026-02-20T12:00:00.000Z',
        }),
      ).toBe(Date.parse('2026-02-20T12:00:00.000Z'));
    });
  });
});
