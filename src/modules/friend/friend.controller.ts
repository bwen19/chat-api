import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser } from '@common/decorators';
import { JwtAuthGuard } from '@common/guards';
import { UserEntity } from '@entities';
import { FriendVo } from '@interfaces/vo';
import { FriendService } from './friend.service';

@Controller('friend')
@ApiTags('Friend')
@UseGuards(JwtAuthGuard)
export class FriendController {
  constructor(private readonly friendService: FriendService) {}

  @Get('mine')
  async getFriends(@AuthUser() user: UserEntity): Promise<FriendVo[]> {
    return this.friendService.getFriends(user);
  }
}
