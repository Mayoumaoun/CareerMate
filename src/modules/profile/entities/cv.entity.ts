import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ProfileEntity } from "./profile.entity";

@Entity("cv")
export class CvEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;
    @Column()
    title: string;
    @Column()
    fileUrl: string;

    @CreateDateColumn()
    uploadedAt: Date;

    @ManyToOne(() => ProfileEntity, (profile: ProfileEntity) => profile.cvs)
    @JoinColumn()
    profile: ProfileEntity;
}