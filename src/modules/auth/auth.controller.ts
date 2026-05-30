import { UserService } from './../user/user.service';
import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { SignInDto } from './dto/sign-in.dto';
import { Public } from 'src/common/decorators/isPublic.decorator';
import { use } from 'passport';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { ConfigService } from '@nestjs/config';
import { ProfileService } from '../profile/profile.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService, private readonly configService: ConfigService, private readonly userService: UserService ,private readonly profileService: ProfileService){}

    @Public()
    @Post('signup')
    signUp(@Body() createUserDto: CreateUserDto){
        return this.authService.signUp(createUserDto);
    }

    @Public()
    @Post('signin')
    sigIn(@Body() signInDto: SignInDto){
        return this.authService.signIn(signInDto);
    }

    @Public()
    @UseGuards(GoogleAuthGuard)
    @Get('google')
    async googleAuth(){}

 @Public()
@UseGuards(GoogleAuthGuard)
@Get('google/callback')
async googleCallback(@Req() req, @Res() res) {
  const userFromGoogle = req.user;

  // 1. chercher user
  let user = await this.userService.findOneByCriteria(
    "email",
    userFromGoogle.email
  );


  //  vérifier si profil existe
  const profile = await this.profileService.getProfile(user.id);

  const tokens = await this.authService.jwtLogin(user);

  const frontUrl = this.configService.get<string>('FRONTEND_URL');

const redirectUrl = `${frontUrl}/auth/callback?access_token=${tokens.access_token}&refresh_token=${tokens.refresh_token}&next=${
  profile ? 'dashboard' : 'onboarding'
}`;

return res.redirect(redirectUrl);
}

@Public()
@UseGuards(AuthGuard('jwt-refresh'))
@Post('refresh')
async refresh(@Req() req) {
  return this.authService.refreshAccessToken(req.user);
}
}
