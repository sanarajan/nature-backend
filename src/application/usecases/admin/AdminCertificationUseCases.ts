import { inject, injectable } from 'tsyringe';
import { ICertificationRepository } from '../../../domain/repositories/ICertificationRepository';
import { ICertificationDocument } from '../../../infrastructure/database/models/CertificationModel';
import cloudinary from '../../../infrastructure/config/cloudinary';
import { AppError } from '../../../shared/utils/AppError';
import { STATUS_CODES } from '../../../shared/constants/statusCodes';

/**
 * Safely extracts the Cloudinary public_id for a certification logo image.
 * Ensures the target strictly belongs to the 'natural_ayam/certifications' folder
 * and is not an external URL, unrelated asset, or nested pdf document.
 */
function extractCertificationLogoPublicId(url?: string): string | null {
    if (!url || typeof url !== 'string') return null;
    try {
        if (!url.includes('res.cloudinary.com')) return null;
        const match = url.match(/\/image\/upload\/(?:v\d+\/)?(natural_ayam\/certifications\/(?!pdfs\/|certificates\/)[^.?#]+)(?:\.[a-zA-Z0-9]+)?/);
        if (match && match[1]) {
            return decodeURIComponent(match[1]);
        }
    } catch {
        return null;
    }
    return null;
}

/**
 * Safely extracts the Cloudinary public_id for a certificate image.
 */
function extractCertificateImagePublicId(url?: string): string | null {
    if (!url || typeof url !== 'string') return null;
    try {
        if (!url.includes('res.cloudinary.com')) return null;
        const match = url.match(/\/image\/upload\/(?:v\d+\/)?(natural_ayam\/certifications\/certificates\/[^.?#]+)(?:\.[a-zA-Z0-9]+)?/);
        if (match && match[1]) {
            return decodeURIComponent(match[1]);
        }
    } catch {
        return null;
    }
    return null;
}

@injectable()
export class AdminCertificationUseCases {
    constructor(
        @inject('ICertificationRepository') private certificationRepository: ICertificationRepository
    ) {}

    async addCertification(data: {
        name: string;
        fileData: string;
        originalFileName?: string;
        certificateImageData?: string;
        originalCertificateName?: string;
        pdfData?: string;
        originalPdfName?: string;
        description?: string;
    }) {
        const trimmedName = typeof data.name === 'string' ? data.name.trim() : '';
        if (!trimmedName) {
            throw new AppError('Certification name is required and cannot be empty or whitespace only.', STATUS_CODES.BAD_REQUEST);
        }
        if (!data.fileData) {
            throw new AppError('Logo image is required.', STATUS_CODES.BAD_REQUEST);
        }

        const certData = data.certificateImageData || data.pdfData;
        if (!certData) {
            throw new AppError('Certificate image is required.', STATUS_CODES.BAD_REQUEST);
        }

        // Backend logo image validation
        const isLogoImage = /^data:image\/(jpeg|jpg|png|webp|gif);base64,/.test(data.fileData);
        if (!isLogoImage) {
            throw new AppError('Only JPG, JPEG, PNG, WEBP, GIF and supported image files are allowed for Logo.', STATUS_CODES.BAD_REQUEST);
        }

        // Backend certificate image validation - strictly reject PDF
        if (certData.startsWith('data:application/pdf;base64,') || certData.includes('%PDF-')) {
            throw new AppError('PDF files are not allowed for certificate. Please upload an image (JPG, JPEG, PNG, WEBP).', STATUS_CODES.BAD_REQUEST);
        }

        const isCertImage = /^data:image\/(jpeg|jpg|png|webp);base64,/.test(certData);
        if (!isCertImage) {
            throw new AppError('Only JPG, JPEG, PNG, and WEBP image files are allowed for Certificate Image.', STATUS_CODES.BAD_REQUEST);
        }

        let fileUrl = '';
        try {
            // Upload Logo to Cloudinary
            const uploadRes = await cloudinary.uploader.upload(data.fileData, {
                folder: 'natural_ayam/certifications',
                resource_type: 'image'
            });
            fileUrl = uploadRes.secure_url;
        } catch (error) {
            console.error('Cloudinary logo upload error:', error);
            throw new AppError('Logo image upload failed', STATUS_CODES.INTERNAL_SERVER_ERROR);
        }

        let certImageUrl = '';
        let certImagePublicId = '';
        const originalCertName = data.originalCertificateName || data.originalPdfName;
        try {
            // Upload Certificate Image to Cloudinary as image
            const uploadCertRes = await cloudinary.uploader.upload(certData, {
                folder: 'natural_ayam/certifications/certificates',
                resource_type: 'image'
            });
            certImagePublicId = uploadCertRes.public_id;
            certImageUrl = uploadCertRes.secure_url;
        } catch (error) {
            console.error('Cloudinary certificate image upload error:', error);
            throw new AppError('Certificate image upload failed', STATUS_CODES.INTERNAL_SERVER_ERROR);
        }

        const trimmedDescription = typeof data.description === 'string' ? data.description.trim() : '';

        return await this.certificationRepository.create({
            name: trimmedName,
            fileUrl: fileUrl,
            originalFileName: data.originalFileName,
            pdfUrl: certImageUrl,
            originalPdfName: originalCertName,
            pdfPublicId: certImagePublicId,
            certificateImageUrl: certImageUrl,
            originalCertificateName: originalCertName,
            certificateImagePublicId: certImagePublicId,
            description: trimmedDescription || undefined
        });
    }

    async getAllCertifications() {
        return await this.certificationRepository.findAll();
    }

    async getCertificationById(id: string) {
        const cert = await this.certificationRepository.findById(id);
        if (!cert) {
            throw new AppError('Certification not found', STATUS_CODES.NOT_FOUND);
        }
        return cert;
    }

    async editCertification(id: string, data: {
        name: string;
        fileData?: string;
        originalFileName?: string;
        certificateImageData?: string;
        originalCertificateName?: string;
        pdfData?: string;
        originalPdfName?: string;
        description?: string;
    }) {
        const trimmedName = typeof data.name === 'string' ? data.name.trim() : '';
        if (!trimmedName) {
            throw new AppError('Certification name is required and cannot be empty or whitespace only.', STATUS_CODES.BAD_REQUEST);
        }

        const existingCert = await this.certificationRepository.findById(id);
        if (!existingCert) {
            throw new AppError('Certification not found', STATUS_CODES.NOT_FOUND);
        }

        let fileUrl = existingCert.fileUrl;
        let originalFileName = existingCert.originalFileName;
        const isExistingPdf = existingCert.pdfUrl && (existingCert.pdfUrl.toLowerCase().includes('/pdfs/') || existingCert.pdfUrl.toLowerCase().endsWith('.pdf'));
        let certificateImageUrl = existingCert.certificateImageUrl || (!isExistingPdf ? existingCert.pdfUrl : undefined);
        let originalCertificateName = existingCert.originalCertificateName || (!isExistingPdf ? existingCert.originalPdfName : undefined);
        let certificateImagePublicId = existingCert.certificateImagePublicId || (!isExistingPdf ? existingCert.pdfPublicId : undefined);
        let pdfUrl = existingCert.pdfUrl;
        let originalPdfName = existingCert.originalPdfName;
        let pdfPublicId = existingCert.pdfPublicId;
        let description = existingCert.description;

        if (data.description !== undefined) {
            description = typeof data.description === 'string' ? data.description.trim() : '';
        }

        // Retain old identifiers before update
        const oldLogoPublicId = extractCertificationLogoPublicId(existingCert.fileUrl);
        const oldCertImagePublicId = existingCert.certificateImagePublicId || extractCertificateImagePublicId(existingCert.certificateImageUrl || existingCert.pdfUrl);
        const oldPdfPublicId = existingCert.pdfPublicId;

        let newLogoUploaded = false;
        let newCertUploaded = false;
        let newLogoPublicId: string | null = null;
        let newCertPublicId: string | null = null;

        // If a new Logo was provided
        if (data.fileData) {
            const isImage = /^data:image\/(jpeg|jpg|png|webp|gif);base64,/.test(data.fileData);
            if (!isImage) {
                throw new AppError('Only JPG, JPEG, PNG, WEBP, GIF and supported image files are allowed for Logo.', STATUS_CODES.BAD_REQUEST);
            }

            try {
                const uploadRes = await cloudinary.uploader.upload(data.fileData, {
                    folder: 'natural_ayam/certifications',
                    resource_type: 'image'
                });
                fileUrl = uploadRes.secure_url;
                newLogoPublicId = uploadRes.public_id;
                newLogoUploaded = true;
                originalFileName = data.originalFileName || originalFileName;
            } catch (error) {
                console.error('Cloudinary logo upload error:', error);
                throw new AppError('Logo image upload failed', STATUS_CODES.INTERNAL_SERVER_ERROR);
            }
        }

        // If a new Certificate Image was provided
        const certData = data.certificateImageData || data.pdfData;
        if (certData) {
            if (certData.startsWith('data:application/pdf;base64,') || certData.includes('%PDF-')) {
                throw new AppError('PDF files are not allowed for certificate. Please upload an image (JPG, JPEG, PNG, WEBP).', STATUS_CODES.BAD_REQUEST);
            }

            const isCertImage = /^data:image\/(jpeg|jpg|png|webp);base64,/.test(certData);
            if (!isCertImage) {
                throw new AppError('Only JPG, JPEG, PNG, and WEBP image files are allowed for Certificate Image.', STATUS_CODES.BAD_REQUEST);
            }

            try {
                const uploadCertRes = await cloudinary.uploader.upload(certData, {
                    folder: 'natural_ayam/certifications/certificates',
                    resource_type: 'image'
                });
                certificateImagePublicId = uploadCertRes.public_id;
                certificateImageUrl = uploadCertRes.secure_url;
                newCertPublicId = uploadCertRes.public_id;
                newCertUploaded = true;
                originalCertificateName = data.originalCertificateName || data.originalPdfName || originalCertificateName;
                pdfUrl = uploadCertRes.secure_url;
                pdfPublicId = uploadCertRes.public_id;
                originalPdfName = originalCertificateName;
            } catch (error) {
                console.error('Cloudinary certificate image upload error:', error);
                throw new AppError('Certificate image upload failed', STATUS_CODES.INTERNAL_SERVER_ERROR);
            }
        }

        // 1. Update database record first
        const updatedCert = await this.certificationRepository.update(id, {
            name: trimmedName,
            fileUrl: fileUrl,
            originalFileName: originalFileName,
            pdfUrl: pdfUrl,
            originalPdfName: originalPdfName,
            pdfPublicId: pdfPublicId,
            certificateImageUrl: certificateImageUrl,
            originalCertificateName: originalCertificateName,
            certificateImagePublicId: certificateImagePublicId,
            description: description
        });

        // 2. Only after database update succeeds, clean up old assets from Cloudinary
        if (newLogoUploaded && oldLogoPublicId && oldLogoPublicId !== newLogoPublicId) {
            try {
                await cloudinary.uploader.destroy(oldLogoPublicId, { resource_type: 'image' });
            } catch (err) {
                console.error('Failed to cleanup old certification logo from Cloudinary:', err);
            }
        }

        if (newCertUploaded) {
            // Clean up old certificate image if it was an image
            if (oldCertImagePublicId && oldCertImagePublicId !== newCertPublicId && oldCertImagePublicId.startsWith('natural_ayam/certifications/certificates/')) {
                try {
                    await cloudinary.uploader.destroy(oldCertImagePublicId, { resource_type: 'image' });
                } catch (err) {
                    console.error('Failed to cleanup old certificate image from Cloudinary:', err);
                }
            }
            // Clean up old PDF if it was a raw PDF
            if (oldPdfPublicId && typeof oldPdfPublicId === 'string' && oldPdfPublicId.startsWith('natural_ayam/certifications/pdfs/')) {
                try {
                    await cloudinary.uploader.destroy(oldPdfPublicId, { resource_type: 'raw' });
                } catch (err) {
                    console.error('Failed to cleanup old certificate PDF from Cloudinary:', err);
                }
            }
        }

        return updatedCert;
    }

    async deleteCertification(id: string) {
        const existingCert = await this.certificationRepository.findById(id);
        if (!existingCert) {
            throw new AppError('Certification not found', STATUS_CODES.NOT_FOUND);
        }

        const oldLogoUrl = existingCert.fileUrl;
        const oldCertImagePublicId = existingCert.certificateImagePublicId || extractCertificateImagePublicId(existingCert.certificateImageUrl || existingCert.pdfUrl);
        const oldPdfPublicId = existingCert.pdfPublicId;

        // 1. Delete record from MongoDB first
        await this.certificationRepository.delete(id);

        // 2. Only after MongoDB deletion succeeds, clean up associated files from Cloudinary
        const logoPublicId = extractCertificationLogoPublicId(oldLogoUrl);
        if (logoPublicId) {
            try {
                await cloudinary.uploader.destroy(logoPublicId, { resource_type: 'image' });
            } catch (err) {
                console.error('Failed to cleanup certification logo from Cloudinary:', err);
            }
        } else if (oldLogoUrl) {
            console.warn('Skipping logo Cloudinary deletion: Could not determine valid certification public ID from URL');
        }

        if (oldCertImagePublicId && oldCertImagePublicId.startsWith('natural_ayam/certifications/certificates/')) {
            try {
                await cloudinary.uploader.destroy(oldCertImagePublicId, { resource_type: 'image' });
            } catch (err) {
                console.error('Failed to cleanup certificate image from Cloudinary:', err);
            }
        }

        if (oldPdfPublicId && typeof oldPdfPublicId === 'string' && oldPdfPublicId.startsWith('natural_ayam/certifications/pdfs/')) {
            try {
                await cloudinary.uploader.destroy(oldPdfPublicId, { resource_type: 'raw' });
            } catch (err) {
                console.error('Failed to cleanup certificate PDF from Cloudinary:', err);
            }
        }

        return true;
    }
}
