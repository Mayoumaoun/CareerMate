import { Injectable, UnauthorizedException } from "@nestjs/common";
import { UserService } from "../user/user.service";
import { CreateUserDto} from "../user/dto/create-user.dto";
import { SignInDto } from "./dto/sign-in.dto";
import * as bcrypt from "bcrypt";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService
    ){}

    async signUp(newUser: CreateUserDto){
        const user=await this.userService.findOneByCriteria("email",newUser.email);
        if(user){
            //redirect to login
        }
        return await this.userService.create(newUser);

    }

    async signIn(signInDto: SignInDto){
        const user=await this.userService.findOneByCriteria("email",signInDto.email);
        if(!user){
            throw new UnauthorizedException("user does not exist");
        }
        if (!user.passwordHash || user.passwordHash === '') {
            throw new UnauthorizedException();
        }     
        const isMatch = await bcrypt.compare(signInDto.password, user.passwordHash);
        if(!isMatch ){
            throw new UnauthorizedException("wrong password");
        }

        return await this.jwtLogin(user);
    }

    async jwtLogin(user:any){
        const payload = { sub: user.id, username: user.username};
        
        const accessToken = await this.jwtService.signAsync(payload);
        const refreshToken = await this.generateRefreshToken(payload);
        
        // Sauvegarder le refresh token en base de données
        await this.userService.update(user.id, { refreshToken });
        
        return {
            access_token: accessToken,
            refresh_token: refreshToken,
            token_type: 'Bearer',
            expires_in: this.configService.get<string>('JWT_EXPIRES_IN', '15m')
        };
    }

    async generateRefreshToken(payload: any) {
        const refreshSecret = this.configService.get<string>('JWT_TOKEN_REFRESH')?.trim();
        if (!refreshSecret) {
            throw new Error(
                'JWT_TOKEN_REFRESH is missing. Set it in .env or .env.development (see .env.example).',
            );
        }

        return await this.jwtService.signAsync(payload, {
            secret: refreshSecret,
            expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d') as any,
        });
    }

    async refreshAccessToken(user: any) {
        const userEntity = await this.userService.findOneByCriteria('id', user.userId);
        
        if (!userEntity || !userEntity.refreshToken || userEntity.refreshToken !== user.refreshToken) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        const payload = { sub: user.userId, username: user.username };
        const newAccessToken = await this.jwtService.signAsync(payload);

        return {
            access_token: newAccessToken,
            token_type: 'Bearer',
            expires_in: this.configService.get<string>('JWT_EXPIRES_IN', '15m')
        };
    }
    
    async findOrCreateOAuthUser(profile: { email: string; name: string; avatar: string; provider: string }) {
        const user= await this.userService.findOneByCriteria("email",profile.email);
        if(!user){
            const newUser: CreateUserDto={
                email: profile.email,
                username: profile.name,
                password: '', 
                // provider: profile.provider,
                }
            return await this.userService.create(newUser);
        }
        return user;
    }
}