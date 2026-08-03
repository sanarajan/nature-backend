import { UserRole } from '../../constants/enums/UserRole';

export class User {
    constructor(
        public readonly id: string,
        public readonly email: string,
        public readonly displayName?: string,
        public readonly username?: string,
        public readonly phoneNumber?: string,
        public password?: string,
        public readonly role: UserRole = UserRole.USER,
        public readonly verified: boolean = false,
        public readonly imageUrl?: string,
        public readonly referralId?: string,
        public readonly referredBy?: string,
        public readonly addresses: any[] = [],
        public readonly createdAt: Date = new Date(),
        public readonly updatedAt: Date = new Date(),
        public readonly isInfluencer: boolean = false,
        public readonly influencerCode?: string,
        public readonly influencerRequestStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null,
        public readonly influencerRequestDate?: Date,
        public readonly influencerSocialProfiles?: {
            facebook?: string;
            instagram?: string;
            youtube?: string;
        },
        public readonly influencerRejectionReason?: string,
        public readonly influencerStatus: string = 'Active',
        public readonly influencerReferralVisits: number = 0,
        public readonly commissionPercentage?: number,
        public readonly influencerWalletBalance?: number,
        public readonly influencerWithdrawalHold?: number,
        public readonly withdrawalHold?: number,
        public readonly influencerPendingBalance?: number,
        public readonly influencerTotalEarned?: number,
        public readonly influencerTotalWithdrawn?: number,
        public readonly accountHolderName?: string,
        public readonly bankName?: string,
        public readonly accountNumber?: string,
        public readonly ifscCode?: string,
        public readonly upiId?: string,
        public readonly passwordResetTokenHash?: string | null,
        public readonly passwordResetTokenExpiresAt?: Date | null,
        public readonly googleId?: string,
        public readonly authProvider?: string
    ) { }
}

