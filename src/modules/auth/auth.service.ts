import { Injectable, UnauthorizedException } from "@nestjs/common";
import { UserService } from "../user/user.service";
import { CreateUserDto} from "../user/dto/create-user.dto";
import { SignInDto } from "./dto/sign-in.dto";
import * as bcrypt from "bcrypt";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class AuthService {
    constructor(private readonly userService: UserService,
    private readonly jwtService: JwtService
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
        const payload = { userId: user.id, username: user.username};
        return {
            access_token: await this.jwtService.signAsync(payload),
            //refresh_token
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