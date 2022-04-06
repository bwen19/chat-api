import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { UploadAvatarInterceptor } from '@common/interceptors';
import { JwtAuthGuard, RolesGuard } from '@common/guards';
import { AuthUser, Roles } from '@common/decorators';
import { UserRole } from '@constants';
import { UserEntity } from '@entities';
import {
  CreateUserDto,
  SearchUserDto,
  UpdateAvatarDto,
  UpdateNicknameDto,
  UpdatePasswordDto,
  UpdateUserDto,
  UserListDto,
} from '@interfaces/dto';
import { UserVo, UserListVo, AvatarVo } from '@interfaces/vo';
import { UserService } from './user.service';

@Controller('user')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiTags('User')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // Controllers for common users
  @Get('search')
  @Roles(UserRole.USER)
  async searchUser(@Query() searchUserDto: SearchUserDto): Promise<UserVo> {
    return this.userService.searchUser(searchUserDto);
  }

  @Patch('nickname')
  @Roles(UserRole.USER)
  async updateNickname(
    @AuthUser() user: UserEntity,
    @Body() updateNicknameDto: UpdateNicknameDto,
  ): Promise<UserVo> {
    return this.userService.updateUser(user, updateNicknameDto);
  }

  @Patch('avatar')
  @Roles(UserRole.USER)
  async updateAvatar(
    @AuthUser() user: UserEntity,
    @Body() updateAvatarDto: UpdateAvatarDto,
  ): Promise<UserVo> {
    return this.userService.updateUser(user, updateAvatarDto);
  }

  @Post('avatar')
  @Roles(UserRole.USER)
  @UseInterceptors(UploadAvatarInterceptor)
  async uploadAvatar(@UploadedFile() file: Express.Multer.File): Promise<AvatarVo> {
    return this.userService.uploadAvatar(file);
  }

  @Patch('password')
  @Roles(UserRole.USER)
  async updatePassword(
    @AuthUser() user: UserEntity,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ): Promise<UserVo> {
    return this.userService.updatePassword(user, updatePasswordDto);
  }

  // Controllers for administrators
  @Get('list')
  async getUserList(@Query() userListDto: UserListDto): Promise<UserListVo> {
    return this.userService.getUserList(userListDto);
  }

  @Post('')
  async createUser(@Body() createUserDto: CreateUserDto): Promise<UserVo> {
    return this.userService.createUser(createUserDto);
  }

  @Put(':userId')
  async updateUser(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserVo> {
    return this.userService.updateUser(userId, updateUserDto);
  }

  @Delete(':userId')
  async deleteUser(@Param('userId', new ParseUUIDPipe()) userId: string): Promise<UserVo> {
    return this.userService.deleteUser(userId);
  }
}
