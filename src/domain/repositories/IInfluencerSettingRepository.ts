export interface IInfluencerSettingRepository {
    getSettings(): Promise<any>;
    updateSettings(data: any): Promise<any>;
}
