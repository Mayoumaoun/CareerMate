import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { ProfileEntity } from "./profile.entity";

@Entity("project")
export class ProjectEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;
    @Column()
    title: string;
    @Column({type: 'date'})
    date: Date;

    @Column({type: 'text'})
    context: string;
    @Column({type: 'text'}) 
    description: string;
    @Column("text", { array: true })
    techStack: string[];
    @Column({type: 'text'})
    projectUrl: string;
    @Column({ type: 'text', nullable: true })
    githubUrl: string | null; 

    @Column({ type: 'text', nullable: true })
    githubFrontendUrl: string | null;

    @Column({ type: 'text', nullable: true })
    githubBackendUrl: string | null;

    @Column({ type: 'text', nullable: true })
    demoVideo: string | null;

    @Column('text', { array: true, default: [] })
    demoImages: string[];

    @Column({ type: 'text', nullable: true })
    workDone: string | null;

    @Column('text', { array: true, default: [] })
    features: string[];

    @Column({ type: 'text', nullable: true })
    imageUrl: string | null;    

    @Column({ default: false })
    isFrontend: boolean;

    @Column({ default: false })
    isBackend: boolean;

    @Column({ type: 'date', nullable: true })
    endDate: Date | null;
    @CreateDateColumn()
    createdAt: Date;
    @UpdateDateColumn()
    updatedAt: Date;
    @DeleteDateColumn({nullable: true})
    deletedAt: Date | null;
    @Column({ default: true })
    isPublic: boolean;

    @ManyToOne(() => ProfileEntity, (profile: ProfileEntity) => profile.projects, { nullable: false })
    @JoinColumn({ name: 'profileId' })
    profile: ProfileEntity;
}
