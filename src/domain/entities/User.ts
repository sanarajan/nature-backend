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
        public readonly updatedAt: Date = new Date()
    ) { }
}
