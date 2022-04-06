import { HttpAdapterHost } from '@nestjs/core';
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { TypeORMError } from 'typeorm';

@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    let statusCode: number;
    let message: string;
    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res: any = exception.getResponse();
      if (res.message instanceof Array && typeof res.message[0] === 'string') {
        message = res.message[0];
      } else {
        message = exception.message;
      }
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      if (exception instanceof TypeORMError) {
        message = '数据库错误';
      } else {
        message = '服务器内部未知错误';
        console.log(exception);
      }
    }

    const responseBody = { statusCode, message };
    httpAdapter.reply(ctx.getResponse(), responseBody, statusCode);
  }
}
