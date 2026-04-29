import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { SignInDto } from './dto/sign-in.dto';
import { Public } from 'src/common/decorators/isPublic.decorator';
import { use } from 'passport';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService, private readonly configService: ConfigService){}

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
    async googleCallback(@Req() req, @Res() res){
        const tokens=await this.authService.jwtLogin(req.user);
        const frontUrl=await this.configService.get<string>('FRONTEND_URL');
        res.redirect(`${frontUrl}/auth?token=${tokens.access_token}`);
    }

}
