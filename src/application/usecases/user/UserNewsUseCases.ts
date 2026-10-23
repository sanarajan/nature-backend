import { inject, injectable } from 'tsyringe';
import { INewsRepository } from '../../../domain/repositories/INewsRepository';

export interface PublicNewsDto {
    _id: string;
    title: string;
    summary: string;
    content: string;
    publishedDate: Date;
    imageUrl: string;
    websiteUrl: string;
    status: 'active';
    createdAt: Date;
}

@injectable()
export class UserNewsUseCases {
    constructor(
        @inject('INewsRepository') private newsRepository: INewsRepository
    ) {}

    async getActiveNews(): Promise<PublicNewsDto[]> {
        const newsList = await this.newsRepository.findActive();
        return newsList.map((item) => ({
            _id: item._id ? item._id.toString() : '',
            title: item.title,
            summary: item.summary || '',
            content: item.content || '',
            publishedDate: item.publishedDate,
            imageUrl: item.imageUrl,
            websiteUrl: item.websiteUrl || '',
            status: 'active' as const,
            createdAt: item.createdAt
        }));
    }
}
