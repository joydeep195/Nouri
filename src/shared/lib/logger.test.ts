import { describe, expect, it } from 'vitest';
import { describeError, installGlobalErrorHandlers, logger } from './logger';

describe('logger', () => {
  it('keeps a bounded in-memory log', () => {
    logger.clear();
    for (let i = 0; i < 70; i++) logger.info(`event ${i}`);
    const entries = logger.entries();
    expect(entries).toHaveLength(50);
    expect(entries[0]?.message).toBe('event 20');
  });

  it('describes errors briefly', () => {
    expect(describeError(new TypeError('boom'))).toBe('TypeError: boom');
    expect(describeError('x'.repeat(900))).toHaveLength(500);
    expect(describeError({ secret: 1 })).toBe('Unknown error');
  });

  it('records uncaught errors and rejections', () => {
    logger.clear();
    const target = new EventTarget() as unknown as Window;
    installGlobalErrorHandlers(target);
    target.dispatchEvent(Object.assign(new Event('error'), { error: new Error('kaboom') }));
    target.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason: 'nope' }));
    expect(logger.entries().map((e) => e.detail)).toEqual(['Error: kaboom', 'nope']);
  });
});
