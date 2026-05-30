import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ProfileEntity } from "../profile/entities/profile.entity";

export enum CvType {
    UPLOADED = "uploaded",
    GENERATED = "generated",
    OPTIMIZED = "optimized"
}

@Entity("cv")
export class CvEntity {

    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    title: string;

    @Column({ nullable: true })
    fileUrl: string;

    @Column({ type: 'enum', enum: CvType, default: CvType.UPLOADED })
    type: CvType;
    
    @Column({ type: 'text', nullable: true })
    rawText: string;

    @Column({ type: 'jsonb', nullable: true })
    optimizedData: Record<string, any> | null;

    //{name,email,phone,linkedin,github}
    @Column({ type: 'jsonb', nullable: true })
    personalInfo: Record<string, any> | null;

    @Column({ nullable: true })
    targetJobTitle: string;

    @Column({ nullable: true })
    targetJobDescription: string;

    @Column({ type: 'int', nullable: true })
    atsScoreOriginal: number;

     @Column({ type: 'int', nullable: true })
    atsScoreOptimized: number;

    @CreateDateColumn()
    uploadedAt: Date;

    @ManyToOne(() => ProfileEntity, (profile: ProfileEntity) => profile.cvs)
    @JoinColumn()
    profile: ProfileEntity;
}