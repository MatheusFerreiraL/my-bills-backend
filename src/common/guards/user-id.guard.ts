import { BadRequestException, CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { RequestWithUserId } from '../http/request-with-user-id';

/**
 * Interim tenant-resolution mechanism (AD-3), used until a real auth/session system exists.
 * Every request must carry `x-user-id` as a UUID identifying the tenant. Registered globally
 * (APP_GUARD in AppModule) so every current and future endpoint gets this for free — see
 * .claude/rules/api-contract.md's "Auth / Tenant Scoping" section.
 */
@Injectable()
export class UserIdGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUserId>();
    const header = request.headers['x-user-id'];
    const userId = Array.isArray(header) ? header[0] : header;

    if (!userId || !isUUID(userId)) {
      throw new BadRequestException(
        'Missing or invalid x-user-id header: required, must be a UUID identifying the tenant ' +
          '(interim auth mechanism — see .claude/rules/api-contract.md).',
      );
    }

    request.userId = userId;
    return true;
  }
}
