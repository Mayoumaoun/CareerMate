import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-google-oauth20";
import { AuthService } from "../auth.service";

@Injectable()
export class GoogleOAuthStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(private configService: ConfigService,private readonly authService: AuthService) {
        super({
            clientID: configService.get<string>('GOOGLE_CLIENT_ID')?? '',
            clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET')?? '',
            callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL')?? '',
            scope: ['email', 'profile'],
        });
    }
    async validate(accesToken: string, refreshToken: string, profile: any) {
        const { emails, displayName, photos } = profile;

        const user = await this.authService.findOrCreateOAuthUser({
                email: emails[0].value,
                name: displayName,
                avatar: photos[0].value,
                provider: 'google',
        });

        return user;
    }
}