import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithUserId } from '../http/request-with-user-id';

export const UserId = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  return ctx.switchToHttp().getRequest<RequestWithUserId>().userId;
});
