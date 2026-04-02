import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { UserEntity } from "./entities/user.entity";
import { Repository } from "typeorm";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import * as bcrypt from "bcrypt";

@Injectable()
export class UserService {
    constructor(@InjectRepository(UserEntity) private readonly userRepo: Repository<UserEntity>){}

    async create(createUserDto: CreateUserDto) {
        try{
            const {password, ...rest}= createUserDto;
            const salt= await bcrypt.genSalt();
            const passwordHash= await bcrypt.hash(password,salt);
            const user = this.userRepo.create({ ...rest, passwordHash });
            return await this.userRepo.save(user);
        }catch(e){
            console.error('Create user error:', e.message); 
            throw new InternalServerErrorException('Failed to create user');
        }
        
    }
    
    async findAll() {
        const users = await this.userRepo.find({relations: ['cvs']});
        return users;
      }
    
      async findOne(id: string) {
        const user = await this.userRepo.findOne({ where: { id } });
        return user;
      }
      async findOneByCriteria(criteria: string,value: any) {
        const user = await this.userRepo.findOne({ where: { [criteria]:value } });
        return user;
      }
    
      async update(id: string, updateUserDto: UpdateUserDto) {
        await this.userRepo.update(id, updateUserDto);
        return this.findOne(id);
      }
    
      async remove(id: string) {
        const user = await this.findOne(id);
        if(user) { 
          await this.userRepo.remove(user);
        }
        return user;
      }
}