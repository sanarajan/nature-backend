import { inject, injectable } from 'tsyringe';
import { ISponsorRepository } from '../../../domain/repositories/ISponsorRepository';

export interface PublicSponsorDto {
    _id: string;
    companyName: string;
    companyType: string;
    websiteUrl: string;
    imageUrl: string;
    status: 'active';
}

@injectable()
export class UserSponsorUseCases {
    constructor(
        @inject('ISponsorRepository') private sponsorRepository: ISponsorRepository
    ) {}

    async getActiveSponsors(): Promise<PublicSponsorDto[]> {
        const sponsors = await this.sponsorRepository.findActive();
        return sponsors.map((s) => ({
            _id: s._id ? s._id.toString() : '',
            companyName: s.companyName,
            companyType: s.companyType,
            websiteUrl: s.websiteUrl,
            imageUrl: s.imageUrl,
            status: 'active' as const
        }));
    }
}
