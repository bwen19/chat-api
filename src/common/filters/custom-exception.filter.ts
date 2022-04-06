import { BadRequestException, Catch, HttpException } from '@nestjs/common';
import { BaseWsExceptionFilter } from '@nestjs/websockets';
import { TypeORMError } from 'typeorm';

@Catch()
export class CustomExceptionFilter extends BaseWsExceptionFilter {
  handleUnknownError<TClient extends { emit: Function }>(exception: unknown, client: TClient) {
    let message: string;
    if (exception instanceof BadRequestException) {
      const response = exception.getResponse();
      if (typeof response === 'string') {
        message = response;
      } else {
        if (typeof response['message'] === 'string') {
          message = response['message'];
        } else if (
          Array.isArray(response['message']) &&
          typeof response['message'][0] === 'string'
        ) {
          message = response['message'][0];
        }
      }
      client.emit('msgToClient', { status: 'error', message });
    } else {
      if (exception instanceof HttpException) {
        message = exception.message;
      } else if (exception instanceof TypeORMError) {
        message = '数据库错误';
      } else {
        message = '服务器内部错误';
      }
      client.emit('exception', message);
    }
  }
}
