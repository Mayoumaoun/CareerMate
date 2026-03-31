import { UserEntity } from "src/modules/user/entities/user.entity";
import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

enum PostType {
}

@Entity("post")
export class PostEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;
    @Column()
    content: string;
    @Column({ type: 'enum', enum: PostType })   
    type: PostType;
    @Column()
    tone: string;
    @CreateDateColumn()
    createdAt: Date;
    @UpdateDateColumn()
    updatedAt: Date;
    @DeleteDateColumn({nullable: true})
    deletedAt: Date | null;

    @ManyToOne(() => UserEntity, (user: UserEntity) => user.posts)
    @JoinColumn()
    user: UserEntity;
}
