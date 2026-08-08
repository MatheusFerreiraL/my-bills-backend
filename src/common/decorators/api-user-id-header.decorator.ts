import { applyDecorators } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';

export const ApiUserIdHeader = () =>
  applyDecorators(
    ApiHeader({
      name: 'x-user-id',
      description: 'Interim tenant-resolution mechanism. Required UUID identifying the requesting user.',
      required: true,
    }),
  );
