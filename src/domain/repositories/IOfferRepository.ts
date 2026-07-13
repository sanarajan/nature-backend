export interface IOfferRepository {
    createOffer(data: any): Promise<any>;
    findOfferById(id: string): Promise<any>;
    findAllOffers(): Promise<any[]>;
    updateOffer(id: string, data: any): Promise<any>;
    deleteOffer(id: string): Promise<void>;
    toggleOfferStatus(id: string): Promise<any>;
}
