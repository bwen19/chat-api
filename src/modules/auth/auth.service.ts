import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserEntity } from '@entities';
import { UserLoginDto, UserRegisterDto } from '@interfaces/dto';
import { AuthVo, UserVo } from '@interfaces/vo';
import { UserService } from '../user/user.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async signToken(user: UserEntity): Promise<string> {
    return this.jwtService.signAsync({
      id: user.id,
      username: user.username,
    });
  }

  async login(userLoginDto: UserLoginDto): Promise<AuthVo> {
    const user = await this.userService.getUser({ username: userLoginDto.username });
    if (!(await user.validatePassword(userLoginDto.password))) {
      throw new BadRequestException('用户名或密码错误');
    }
    const token = await this.signToken(user);
    return new AuthVo(user, token);
  }

  async register(userRegisterDto: UserRegisterDto): Promise<UserVo> {
    if (userRegisterDto.password !== userRegisterDto.passwordRepeat) {
      throw new BadRequestException('两次输入密码不一致, 请检查');
    }
    const cfgInvitationCode = this.configService.get<string>('invitationCode');
    if (userRegisterDto.invitationCode !== cfgInvitationCode) {
      throw new BadRequestException('邀请码不正确');
    }
    return this.userService.createUser(userRegisterDto);
  }

  async refreshToken(user: UserEntity): Promise<AuthVo> {
    const token = await this.signToken(user);
    return new AuthVo(user, token);
  }

  async verifyToken(token: string): Promise<any> {
    return this.jwtService.verifyAsync(token, {
      secret: this.configService.get<string>('jwt.secret'),
      ignoreExpiration: false,
    });
  }
}
