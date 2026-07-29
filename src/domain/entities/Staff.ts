export class Staff {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly email: string,
        public readonly phone: string,
        public readonly profilePhoto?: string | null,
        public password?: string,
        public readonly status: 'ACTIVE' | 'BLOCKED' = 'ACTIVE',
        public readonly isBlocked: boolean = false,
        public readonly createdAt: Date = new Date(),
        public readonly updatedAt: Date = new Date()
    ) {}
}
