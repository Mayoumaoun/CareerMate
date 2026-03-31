import { UserEntity } from "src/modules/user/entities/user.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity("saved_article")
export class SavedArticleEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    title: string;

    @Column({
    type: 'enum',
    enum: ['INTERESTED', 'DISMISSED'],
    default: 'INTERESTED',
    })
    status: 'INTERESTED' | 'DISMISSED';

    @Column()
    url: string;
    @Column()   
    summary: string;
    @Column()
    source: string;
    @Column({type: 'date'})
    savedAt: Date;

    @ManyToOne(() => UserEntity, (user: UserEntity) => user.savedArticles)
    @JoinColumn()
    user: UserEntity;
}