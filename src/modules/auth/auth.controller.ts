import { Body, Controller, Get, Head, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser } from '@common/decorators';
import { JwtAuthGuard } from '@common/guards';
import { UserEntity } from '@entities';
import { UserLoginDto, UserRegisterDto } from '@interfaces/dto';
import { AuthVo, UserVo } from '@interfaces/vo';
import { AuthService } from './auth.service';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Head('csrf')
  async getCsrfToken(): Promise<void> {
    return;
  }

  @Post('login')
  async login(@Body() userLoginDto: UserLoginDto): Promise<AuthVo> {
    return this.authService.login(userLoginDto);
  }

  @Post('register')
  async register(@Body() userRegisterDto: UserRegisterDto): Promise<UserVo> {
    return this.authService.register(userRegisterDto);
  }

  @Get('check')
  @UseGuards(JwtAuthGuard)
  async checkAuth(@AuthUser() user: UserEntity): Promise<UserVo> {
    return new UserVo(user);
  }

  @Get('refresh')
  @UseGuards(JwtAuthGuard)
  async refreshToken(@AuthUser() user: UserEntity): Promise<AuthVo> {
    return this.authService.refreshToken(user);
  }
}
