import { JwtModuleOptions } from '@nestjs/jwt';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export * from './jwt.config';
export * from './typeorm.config';

export interface ICustomConfig {
  nodeEnv: string;
  port: number;
  database: TypeOrmModuleOptions;
  jwt: JwtModuleOptions;
  invitationCode: string;
}

export const customConfig = (): ICustomConfig => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    autoLoadEntities: true,
    keepConnectionAlive: true,
    // synchronize: true,
    // dropSchema: true,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'SomeSecretKey',
    signOptions: {
      expiresIn: parseInt(process.env.JWT_EXPIRES) || 3600,
    },
  },
  invitationCode: process.env.INVITATION_CODE || 'whosyourdaddy',
});
