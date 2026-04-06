import * as jsonSchemas from "src/common/types/json-schemas";
import { UserEntity } from "src/modules/user/entities/user.entity";
import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { CvEntity } from "./cv.entity";
import { ProjectEntity } from "./projet.entity";

enum UserLevel {
    Senior = "Senior",
    Junior = "Junior",
    Student = "Student",
}
@Entity("profile")
export class ProfileEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;
    @Column()
    bio: string;
    @Column({type:'enum',enum: UserLevel})
    userLevel: UserLevel;
    @CreateDateColumn()
    createdAt: Date;
    @Column({ type: 'float', default: 0 })
    profilScore: number;
    @UpdateDateColumn()
    updatedAt: Date;
    @DeleteDateColumn({nullable: true})
    deletedAt: Date | null;

    @Column({ type: 'jsonb' })
    skills: jsonSchemas.SkillItem[];

    @Column({ type: 'jsonb' })
    experiences: jsonSchemas.ExperienceItem[];

    @Column({ type: 'jsonb', nullable: true })
    targetPosition: jsonSchemas.TargetPosition | null;

    @Column({ type: 'jsonb' })
    education: jsonSchemas.EducationItem[];

    @Column({ type: 'jsonb' })
    languages: jsonSchemas.LanguageItem[];

    @Column({ type: 'jsonb' })
    certifications: jsonSchemas.CertificationItem[];
    @Column({type: 'text', nullable: true})
    shortTermGoals: string | null;
    @Column({type: 'text', nullable: true})
    longTermGoals: string | null;

    @OneToOne(() => UserEntity, (user: UserEntity) => user.profile)
    @JoinColumn()
    user: UserEntity;

    @Column({ type: 'jsonb', nullable: true })
    targetProfile: Record<string, any> | null;

    @OneToMany(() => CvEntity, (cv: CvEntity) => cv.profile)
    cvs: CvEntity[];
    
    @OneToMany(() => ProjectEntity, (project: ProjectEntity) => project.profile)
    projects: ProjectEntity[];
}