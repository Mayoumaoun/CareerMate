import { UserEntity } from "src/modules/user/entities/user.entity";
import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

enum OpportunityType{
    HACKATHON = 'HACKATHON',
    BOURSE = 'BOURSE',
    CONCOURS = 'CONCOURS',
    CONFERENCE = 'CONFERENCE',
    ACCELERATION = 'ACCELERATION',
}

@Entity("opportunity")
export class OpportunityEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    title: string;

    @Column()
    organizer: string;

    @Column({type: 'date'})
    deadline: Date;
    @Column()
    description: string;
    @Column({type: 'enum', enum: OpportunityType})
    type: OpportunityType;

    @Column({
    type: 'enum',
    enum: ['INTERESTED', 'DISMISSED'],
    default: 'INTERESTED',
    })
    status: 'INTERESTED' | 'DISMISSED';

    @Column()
    url: string;
    @Column()
    relevanceScore: number;
    @CreateDateColumn()
    createdAt: Date;

    @DeleteDateColumn({nullable: true})
    deletedAt: Date | null;

    @ManyToOne(() => UserEntity, (user: UserEntity) => user.opportunities)
    @JoinColumn()
    user: UserEntity;

}