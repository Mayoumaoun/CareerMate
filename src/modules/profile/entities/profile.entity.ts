import * as jsonSchemas from "src/common/types/json-schemas";
import { UserEntity } from "src/modules/user/entities/user.entity";
import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { CvEntity } from "../../cv/cv.entity";
import { ProjectEntity } from "./projet.entity";
import { Gender } from "src/modules/user/enums/gender.enum";

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
    @Column({ nullable: true })
    firstName: string | null;
    @Column({ nullable: true })
    lastName: string | null;
    @Column({ nullable: true })
    phone: string | null;
    @Column({ nullable: true })
    country: string | null;
    @Column({ nullable: true })
    city: string | null;
    @Column({type: 'date', nullable: true})
    birthdate: Date | null;
    @Column({type: 'enum', enum: Gender, nullable: true})
    gender: Gender | null;

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

    @Column({ type: 'jsonb', nullable: true })
    profileVector: number[] | null;
  
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