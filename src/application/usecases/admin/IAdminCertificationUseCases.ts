import { ICertificationDocument } from '../../../infrastructure/database/models/CertificationModel';

export interface IAdminCertificationUseCases {
    addCertification(data: {
        name: string;
        fileData: string;
        originalFileName?: string;
        certificateImageData?: string;
        originalCertificateName?: string;
        pdfData?: string;
        originalPdfName?: string;
        description?: string;
    }): Promise<ICertificationDocument>;
    getAllCertifications(): Promise<ICertificationDocument[]>;
    getCertificationById(id: string): Promise<ICertificationDocument | null>;
    editCertification(id: string, data: {
        name: string;
        fileData?: string;
        originalFileName?: string;
        certificateImageData?: string;
        originalCertificateName?: string;
        pdfData?: string;
        originalPdfName?: string;
        description?: string;
    }): Promise<ICertificationDocument | null>;
    deleteCertification(id: string): Promise<boolean>;
}
