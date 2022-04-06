import { IntersectionType, OmitType, PartialType, PickType } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { UserRole } from '@constants';
import { PageOptionsDto } from '.';

export class UserBaseDto {
  @IsNotEmpty({ message: '用户名不能为空' })
  @IsString({ message: '用户名应为字符串' })
  readonly username: string;

  @IsString({ message: '密码应为字符串' })
  @MinLength(6, { message: '密码长度需大于等于6' })
  readonly password: string;

  @IsNotEmpty({ message: '请输入用户昵称' })
  @IsString({ message: '昵称应为字符串' })
  readonly nickname: string;

  @IsEnum(UserRole)
  readonly userRole: UserRole;

  @IsNotEmpty({ message: '请输入avatar路径' })
  @IsString({ message: 'avatar应为字符串' })
  readonly avatarSrc: string;
}

export class UserLoginDto extends PickType(UserBaseDto, ['username', 'password'] as const) {}

export class UserRegisterDto extends UserLoginDto {
  @IsString({ message: '重复密码应为字符串' })
  @IsNotEmpty({ message: '重复密码不能为空' })
  readonly passwordRepeat: string;

  @IsString({ message: '邀请码应为字符串' })
  @IsNotEmpty({ message: '邀请码不能为空' })
  readonly invitationCode: string;
}

export class UpdatePasswordDto extends PickType(UserBaseDto, ['password'] as const) {
  @IsString({ message: '旧密码应为字符串' })
  @IsNotEmpty({ message: '旧密码不能为空' })
  readonly oldPassword: string;

  @IsString({ message: '密码应为字符串' })
  @IsNotEmpty({ message: '请再次输入密码' })
  readonly passwordRepeat: string;
}

export class UpdateNicknameDto extends PickType(UserBaseDto, ['nickname'] as const) {}
export class UpdateAvatarDto extends PickType(UserBaseDto, ['avatarSrc'] as const) {}
export class SearchUserDto extends PickType(UserBaseDto, ['username'] as const) {}

export class UserListDto extends PageOptionsDto {}

export class CreateUserDto extends IntersectionType(
  PartialType(OmitType(UserBaseDto, ['username'] as const)),
  PickType(UserBaseDto, ['username'] as const),
) {}

export class UpdateUserDto extends PartialType(
  PickType(UserBaseDto, ['password', 'nickname', 'avatarSrc', 'userRole'] as const),
) {}
