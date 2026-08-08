import { BadRequestException, ExecutionContext } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { UserIdGuard } from './user-id.guard';

function contextWithHeader(headerValue: string | string[] | undefined): {
  context: ExecutionContext;
  request: { headers: Record<string, string | string[] | undefined>; userId?: string };
} {
  const request: { headers: Record<string, string | string[] | undefined>; userId?: string } = {
    headers: { 'x-user-id': headerValue },
  };
  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
  return { context, request };
}

describe('UserIdGuard', () => {
  const guard = new UserIdGuard();

  it('allows a request with a valid UUID header and attaches userId to the request', () => {
    const userId = randomUUID();
    const { context, request } = contextWithHeader(userId);

    expect(guard.canActivate(context)).toBe(true);
    expect(request.userId).toBe(userId);
  });

  it('rejects a request with no x-user-id header', () => {
    const { context } = contextWithHeader(undefined);

    expect(() => guard.canActivate(context)).toThrow(BadRequestException);
  });

  it('rejects a request with a non-UUID x-user-id header', () => {
    const { context } = contextWithHeader('not-a-uuid');

    expect(() => guard.canActivate(context)).toThrow(BadRequestException);
  });

  it('uses the first value when the header is repeated (array-valued)', () => {
    const userId = randomUUID();
    const { context, request } = contextWithHeader([userId, randomUUID()]);

    expect(guard.canActivate(context)).toBe(true);
    expect(request.userId).toBe(userId);
  });
});
