export interface IComboOfferRepository {
    createComboOffer(data: any): Promise<any>;
    findComboOfferById(id: string): Promise<any>;
    findAllComboOffers(): Promise<any[]>;
    updateComboOffer(id: string, data: any): Promise<any>;
    deleteComboOffer(id: string): Promise<void>;
    toggleComboOfferStatus(id: string): Promise<any>;
}
