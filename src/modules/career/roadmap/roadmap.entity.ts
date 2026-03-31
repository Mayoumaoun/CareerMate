import { UserEntity } from "src/modules/user/entities/user.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

enum RoadmapStatus{}
@Entity("roadmap")
export class RoadmapEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    targetJob: string;

    @Column("jsonb")
    steps: any; 

    @Column({type: 'date', nullable: true})
    startDate: Date | null;

    @Column({type: 'date', nullable: true})
    endDate: Date | null;

    @Column({type: 'enum' , enum: RoadmapStatus})
    status: RoadmapStatus;

    @ManyToOne(() => UserEntity, (user:UserEntity)=> user.roadmaps) 
    @JoinColumn()
    user: UserEntity;
}