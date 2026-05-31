import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Request } from "express";

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, "jwt-refresh") {
    constructor(private readonly configService: ConfigService) {
        const secret = configService.get<string>('JWT_TOKEN_REFRESH')?.trim();
        if (!secret) {
            throw new Error(
                'JWT_TOKEN_REFRESH is missing. Set it in .env or .env.development (see .env.example).',
            );
        }
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: secret,
            passReqToCallback: true,
        });
    }

    async validate(req: Request, payload: any) {
        const refreshToken = req.get('authorization')?.replace('Bearer ', '');
        return {
            userId: payload.sub,
            username: payload.username,
            refreshToken,
        };
    }
}
