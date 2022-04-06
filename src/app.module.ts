import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { setCsrfToken } from '@common/middlewares';
import { AllExceptionFilter } from '@common/filters';
import { customConfig, TypeOrmConfigService } from '@config';
import { AuthModule } from '@modules/auth/auth.module';
import { UserModule } from '@modules/user/user.module';
import { FriendModule } from '@modules/friend/friend.module';
import { ChatModule } from '@modules/chat/chat.module';
import { STATIC_ROOT } from '@constants';
import { join } from 'path';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [customConfig] }),
    TypeOrmModule.forRootAsync({ useClass: TypeOrmConfigService }),
    // ServeStaticModule.forRoot({ rootPath: join(__dirname, '..', STATIC_ROOT) }),
    ThrottlerModule.forRoot({ ttl: 60, limit: 10 }),
    UserModule,
    AuthModule,
    FriendModule,
    ChatModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(setCsrfToken).forRoutes({ path: 'auth/csrf', method: RequestMethod.HEAD });
  }
}
