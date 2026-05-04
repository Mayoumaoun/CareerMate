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

@Module({
    imports: [
        UserModule,
        PassportModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService)=> ({
                secret: configService.get<string>('JWT_TOKEN_SIGN_IN'),
                signOptions: { expiresIn : '1d'}

            })
            
        })
    ],
    providers: [AuthService, JwtStrategy,GoogleOAuthStrategy, {
        provide: APP_GUARD, useClass: JwtAuthGuard
    } ],
    controllers: [AuthController],
    exports: []
})
export class AuthModule {}