import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { UserEntity } from "../user/entities/user.entity";

@Entity("notification")
export class NotificationEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;
    @Column()
    title: string;
    @Column()
    message: string;
    @Column({type: 'boolean', default: false})
    isRead: boolean;
    @CreateDateColumn()
    createdAt: Date;
    @UpdateDateColumn()
    updatedAt: Date;
    @Column()
    entityId: string;
    @Column()
    entityType: string;

    @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'CASCADE' }) 
    user: UserEntity;
}