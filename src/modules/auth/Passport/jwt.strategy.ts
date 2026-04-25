import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy){
    constructor(private readonly configService: ConfigService){
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: configService.get<string>('JWT_TOKEN_SIGN_IN')?? '',
            // secretOrKeyProvider: async (request, rawJwtToken, done) => {
            //     const secret = configService.get<string>('JWT_TOKEN_SIGN_IN');
            //     done(null, secret);
            // },
        })
    }
    async validate(payload: any) {
        return { userId: payload.userId, username: payload.username};
    }
}
