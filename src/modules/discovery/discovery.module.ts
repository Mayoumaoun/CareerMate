import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OpportunityEntity } from "./opportunity/opportunity.entity";
import { SavedArticleEntity } from "./saved-articles/saved-article.entity";

@Module({
    imports: [TypeOrmModule.forFeature([OpportunityEntity,SavedArticleEntity])],
    providers: [],
    controllers: [],
    exports: []
})
export class DiscoveryModule {}