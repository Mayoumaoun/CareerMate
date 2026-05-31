import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from "typeorm";
import { UserEntity } from "src/modules/user/entities/user.entity";

@Entity("job_offer")
export class JobOfferEntity {
  @PrimaryColumn({ type: "varchar" })
  id: string;

  @Column({ type: "varchar" })
  source: string;

  @Column()
  title: string;

  @Column({
    type: "text",
    nullable: true,
  })
  company: string;

  @Column({ type: "text" })
  description: string;

  @Column({ type: "text", nullable: true })
  excerpt: string | null;

  @Column({
    type: "text",
    nullable: true,
  })
  employmentType: string;

  @Column({
    type: "text",
    nullable: true,
  })
  workArrangement: string;

  @Column({
    type: "text",
    nullable: true,
  })
  seniorityLevel: string;

  @Column({ type: "varchar", nullable: true })
  jobFunction: string | null;

  @Column({ type: "varchar", nullable: true })
  location: string | null;

  @Column({ type: "jsonb", default: [] })
  skillsRequired: string[];

  @Column({ type: "int", nullable: true })
  salaryMin: number | null;

  @Column({ type: "int", nullable: true })
  salaryMax: number | null;

  @Column({ type: "varchar", length: 3, nullable: true })
  salaryCurrency: string | null;

  @Column({ type: "int", nullable: true })
  requiredExperienceYears: number | null;

  @Column({ type: "jsonb", nullable: true })
  educationRequired: { level: string; field: string } | null;

  @Column({ type: "jsonb", nullable: true })
  vector: number[] | null;

  @Column({ type: "timestamp", nullable: true })
  postedAt: Date | null;

  @Column()
  url: string;
}