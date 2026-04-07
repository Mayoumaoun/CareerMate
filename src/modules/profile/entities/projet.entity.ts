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
    @Column({type: 'text', nullable: true})
    imageUrl: string | null;
    @CreateDateColumn()
    createdAt: Date;
    @UpdateDateColumn()
    updatedAt: Date;
    @DeleteDateColumn({nullable: true})
    deletedAt: Date | null;

    @ManyToOne(() => ProfileEntity, (profile: ProfileEntity) => profile.projects, { nullable: false })
    @JoinColumn({ name: 'profileId' })
    profile: ProfileEntity;
}
