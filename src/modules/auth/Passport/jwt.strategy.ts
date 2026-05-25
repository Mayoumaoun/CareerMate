import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy){
    constructor(private readonly configService: ConfigService){
        const secret = configService.get<string>('JWT_TOKEN_SIGN_IN')?.trim();
        if (!secret) {
            throw new Error(
                'JWT_TOKEN_SIGN_IN is missing. Set it in .env or .env.developement (see .env.example).',
            );
        }
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: secret,
            // secretOrKeyProvider: async (request, rawJwtToken, done) => {
            //     const secret = configService.get<string>('JWT_TOKEN_SIGN_IN');
            //     done(null, secret);
            // },
        })
    }
    async validate(payload: any) {
        return { userId: payload.sub, username: payload.username};
    }
}
