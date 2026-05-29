import { Module } from "@nestjs/common";
import { UserModule } from "../user/user.module";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { AuthGuard, PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtStrategy } from "./Passport/jwt.strategy";
import { APP_GUARD } from "@nestjs/core";
import { GoogleOAuthStrategy } from "./Passport/googleOAuth.strategy";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { ProfileModule } from "../profile/profile.module";

@Module({
    imports: [
        UserModule,
        PassportModule,
        ProfileModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const secret = configService.get<string>('JWT_TOKEN_SIGN_IN')?.trim();
                if (!secret) {
                    throw new Error(
                        'JWT_TOKEN_SIGN_IN is missing. Set it in .env or .env.developement (see .env.example).',
                    );
                }
                return {
                    secret,
                    signOptions: { expiresIn: '1d' },
                };
            },
            
        })
    ],
    providers: [AuthService, JwtStrategy,GoogleOAuthStrategy, {
        provide: APP_GUARD, useClass: JwtAuthGuard
    } ],
    controllers: [AuthController],
    exports: []
})
export class AuthModule {}