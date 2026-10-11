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
        const match = url.match(/\/image\/upload\/(?:v\d+\/)?(natural_ayam\/certifications\/(?!pdfs\/)[^.?#]+)(?:\.[a-zA-Z0-9]+)?/);
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

    async addCertification(data: { name: string; fileData: string; originalFileName?: string; pdfData?: string; originalPdfName?: string }) {
        const trimmedName = typeof data.name === 'string' ? data.name.trim() : '';
        if (!trimmedName) {
            throw new AppError('Certification name is required and cannot be empty or whitespace only.', STATUS_CODES.BAD_REQUEST);
        }
        if (!data.fileData) {
            throw new AppError('Logo image is required.', STATUS_CODES.BAD_REQUEST);
        }
        if (!data.pdfData) {
            throw new AppError('Certificate PDF file is required.', STATUS_CODES.BAD_REQUEST);
        }

        // Backend logo image validation
        const isImage = /^data:image\/(jpeg|jpg|png|webp|gif);base64,/.test(data.fileData);
        if (!isImage) {
            throw new AppError('Only JPG, JPEG, PNG, WEBP, GIF and supported image files are allowed for Logo.', STATUS_CODES.BAD_REQUEST);
        }

        // Backend certificate PDF validation
        if (!data.pdfData.startsWith('data:application/pdf;base64,')) {
            throw new AppError('Only valid PDF files are allowed for Certificate Upload.', STATUS_CODES.BAD_REQUEST);
        }
        const pdfBase64 = data.pdfData.replace(/^data:application\/pdf;base64,/, '');
        const pdfHeader = Buffer.from(pdfBase64.substring(0, 16), 'base64');
        if (!pdfHeader.toString('ascii').startsWith('%PDF-')) {
            throw new AppError('Invalid PDF file content. File does not match PDF signature.', STATUS_CODES.BAD_REQUEST);
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

        let pdfUrl = '';
        let pdfPublicId = '';
        try {
            // Upload PDF to Cloudinary as raw resource
            const sanitizedPdfBase = (data.originalPdfName || 'certificate')
                .replace(/\.[^/.]+$/, '')
                .replace(/[^a-zA-Z0-9_-]/g, '_');
            const rawPublicId = `natural_ayam/certifications/pdfs/${Date.now()}_${sanitizedPdfBase}.pdf`;
            const uploadPdfRes = await cloudinary.uploader.upload(data.pdfData, {
                public_id: rawPublicId,
                resource_type: 'raw'
            });
            pdfPublicId = uploadPdfRes.public_id;
            pdfUrl = cloudinary.utils.private_download_url(uploadPdfRes.public_id, '', { resource_type: 'raw', type: 'upload' });
        } catch (error) {
            console.error('Cloudinary PDF upload error:', error);
            throw new AppError('Certificate PDF upload failed', STATUS_CODES.INTERNAL_SERVER_ERROR);
        }

        return await this.certificationRepository.create({
            name: trimmedName,
            fileUrl: fileUrl,
            originalFileName: data.originalFileName,
            pdfUrl: pdfUrl,
            originalPdfName: data.originalPdfName,
            pdfPublicId: pdfPublicId
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

    async editCertification(id: string, data: { name: string; fileData?: string; originalFileName?: string; pdfData?: string; originalPdfName?: string }) {
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
        let pdfUrl = existingCert.pdfUrl;
        let originalPdfName = existingCert.originalPdfName;
        let pdfPublicId = existingCert.pdfPublicId;

        // Retain old identifiers before update
        const oldLogoPublicId = extractCertificationLogoPublicId(existingCert.fileUrl);
        const oldPdfPublicId = existingCert.pdfPublicId;
        let newLogoUploaded = false;
        let newPdfUploaded = false;
        let newLogoPublicId: string | null = null;
        let newPdfPublicId: string | null = null;

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

        // If a new PDF was provided
        if (data.pdfData) {
            if (!data.pdfData.startsWith('data:application/pdf;base64,')) {
                throw new AppError('Only valid PDF files are allowed for Certificate Upload.', STATUS_CODES.BAD_REQUEST);
            }
            const pdfBase64 = data.pdfData.replace(/^data:application\/pdf;base64,/, '');
            const pdfHeader = Buffer.from(pdfBase64.substring(0, 16), 'base64');
            if (!pdfHeader.toString('ascii').startsWith('%PDF-')) {
                throw new AppError('Invalid PDF file content. File does not match PDF signature.', STATUS_CODES.BAD_REQUEST);
            }

            try {
                const sanitizedPdfBase = (data.originalPdfName || 'certificate')
                    .replace(/\.[^/.]+$/, '')
                    .replace(/[^a-zA-Z0-9_-]/g, '_');
                const rawPublicId = `natural_ayam/certifications/pdfs/${Date.now()}_${sanitizedPdfBase}.pdf`;
                const uploadPdfRes = await cloudinary.uploader.upload(data.pdfData, {
                    public_id: rawPublicId,
                    resource_type: 'raw'
                });
                pdfPublicId = uploadPdfRes.public_id;
                newPdfPublicId = uploadPdfRes.public_id;
                pdfUrl = cloudinary.utils.private_download_url(uploadPdfRes.public_id, '', { resource_type: 'raw', type: 'upload' });
                newPdfUploaded = true;
                originalPdfName = data.originalPdfName || originalPdfName;
            } catch (error) {
                console.error('Cloudinary PDF upload error:', error);
                throw new AppError('Certificate PDF upload failed', STATUS_CODES.INTERNAL_SERVER_ERROR);
            }
        }

        // 1. Update database record first
        const updatedCert = await this.certificationRepository.update(id, {
            name: trimmedName,
            fileUrl: fileUrl,
            originalFileName: originalFileName,
            pdfUrl: pdfUrl,
            originalPdfName: originalPdfName,
            pdfPublicId: pdfPublicId
        });

        // 2. Only after database update succeeds, clean up old assets from Cloudinary
        // Clean up old logo if replaced
        if (newLogoUploaded && oldLogoPublicId && oldLogoPublicId !== newLogoPublicId) {
            try {
                await cloudinary.uploader.destroy(oldLogoPublicId, { resource_type: 'image' });
            } catch (err) {
                console.error('Failed to cleanup old certification logo from Cloudinary:', err);
            }
        }

        // Clean up old PDF if replaced
        if (newPdfUploaded && oldPdfPublicId && typeof oldPdfPublicId === 'string' && oldPdfPublicId !== newPdfPublicId && oldPdfPublicId.startsWith('natural_ayam/certifications/pdfs/')) {
            try {
                await cloudinary.uploader.destroy(oldPdfPublicId, { resource_type: 'raw' });
            } catch (err) {
                console.error('Failed to cleanup old certificate PDF from Cloudinary:', err);
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
        const oldPdfPublicId = existingCert.pdfPublicId;

        // 1. Delete record from MongoDB first
        await this.certificationRepository.delete(id);

        // 2. Only after MongoDB deletion succeeds, clean up associated files from Cloudinary
        // Clean up logo image if public_id can be reliably extracted
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

        // Clean up certificate PDF if valid pdfPublicId exists
        if (oldPdfPublicId && typeof oldPdfPublicId === 'string' && oldPdfPublicId.startsWith('natural_ayam/certifications/pdfs/')) {
            try {
                await cloudinary.uploader.destroy(oldPdfPublicId, { resource_type: 'raw' });
            } catch (err) {
                console.error('Failed to cleanup certificate PDF from Cloudinary:', err);
            }
        } else if (existingCert.pdfUrl) {
            console.warn('Skipping PDF Cloudinary deletion: Record has no valid certification pdfPublicId');
        }

        return true;
    }
}
