import { inject, injectable } from 'tsyringe';
import { createHash } from 'crypto';
import { ITrackReferralVisitUseCase } from '../../interfaces/user/IInfluencerUseCases';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IInfluencerReferralVisitRepository } from '../../../domain/repositories/IInfluencerReferralVisitRepository';
import { IInfluencerSettingRepository } from '../../../domain/repositories/IInfluencerSettingRepository';

@injectable()
export class TrackReferralVisitUseCase implements ITrackReferralVisitUseCase {
    constructor(
        @inject('IUserRepository') private userRepository: IUserRepository,
        @inject('IInfluencerReferralVisitRepository')
        private influencerReferralVisitRepository: IInfluencerReferralVisitRepository,
        @inject('IInfluencerSettingRepository') private influencerSettingRepository: IInfluencerSettingRepository
    ) {}

    async execute(code: string, sessionId: string, userId?: string | null): Promise<boolean> {
        if (!code || !sessionId) return false;
        
        const settings = await this.influencerSettingRepository.getSettings();
        if (settings && settings.influencerEnabled === false) return false;

        const cleanCode = code.trim().toUpperCase();

        // 1. Find the influencer by their code from the list of all influencers.
        //    findInfluencers() is already defined on IUserRepository and filters isInfluencer: true.
        const allInfluencers = await this.userRepository.findInfluencers();
        const influencer: any = allInfluencers.find(
            (inf: any) =>
                inf.influencerCode &&
                inf.influencerCode.toUpperCase() === cleanCode
        );

        if (!influencer) return false;

        const influencerId: string = influencer._id?.toString() || influencer.id;
        if (!influencerId) return false;

        // 2. Validate influencer is APPROVED and Active
        const reqStatus = influencer.influencerRequestStatus;
        const status = influencer.influencerStatus;

        if (!influencer.isInfluencer || (reqStatus && reqStatus !== 'APPROVED')) return false;
        if (status && ['INACTIVE', 'Inactive', 'BLOCKED', 'Blocked'].includes(status)) return false;

        // 3. Prevent self-referral (the influencer visiting their own link should not count)
        if (userId && userId === influencerId) return false;

        // 4. Build a privacy-safe, deterministic session key.
        //    sha256(influencerCode + ':' + sessionId) — no raw IP or PII is stored.
        const sessionKey = createHash('sha256')
            .update(`${cleanCode}:${sessionId}`)
            .digest('hex');

        // 5. Record the visit (idempotent upsert — duplicate for same session is silently ignored)
        const recorded = await this.influencerReferralVisitRepository.recordVisit({
            influencerId,
            influencerCode: cleanCode,
            sessionKey,
            userId: userId || null
        });

        if (recorded) {
            await this.userRepository.trackReferralVisit(cleanCode);
        }

        return recorded;
    }
}
