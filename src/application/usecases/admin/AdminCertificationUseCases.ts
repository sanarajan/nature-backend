import { inject, injectable } from 'tsyringe';
import { ICertificationRepository } from '../../../domain/repositories/ICertificationRepository';
import { ICertificationDocument } from '../../../infrastructure/database/models/CertificationModel';
import cloudinary from '../../../infrastructure/config/cloudinary';
import { AppError } from '../../../shared/utils/AppError';
import { STATUS_CODES } from '../../../shared/constants/statusCodes';

@injectable()
export class AdminCertificationUseCases {
    constructor(
        @inject('ICertificationRepository') private certificationRepository: ICertificationRepository
    ) {}

    async addCertification(data: { name: string; fileData: string; originalFileName?: string }) {
        if (!data.name) {
            throw new AppError('Certification name is required', STATUS_CODES.BAD_REQUEST);
        }
        if (!data.fileData) {
            throw new AppError('Certification file is required', STATUS_CODES.BAD_REQUEST);
        }

        // Backend image validation
        if (data.fileData) {
            const isImage = /^data:image\/(jpeg|jpg|png|webp|gif);base64,/.test(data.fileData);
            if (!isImage) {
                throw new AppError('Only JPG, JPEG, PNG, WEBP, GIF and supported image files are allowed.', STATUS_CODES.BAD_REQUEST);
            }
        }

        let fileUrl = '';
        try {
            // Upload to Cloudinary.
            const uploadRes = await cloudinary.uploader.upload(data.fileData, {
                folder: 'natural_ayam/certifications',
                resource_type: 'image'
            });
            fileUrl = uploadRes.secure_url;
        } catch (error) {
            console.error('Cloudinary upload error:', error);
            throw new AppError('File upload failed', STATUS_CODES.INTERNAL_SERVER_ERROR);
        }

        return await this.certificationRepository.create({
            name: data.name,
            fileUrl: fileUrl,
            originalFileName: data.originalFileName
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

    async editCertification(id: string, data: { name: string; fileData?: string; originalFileName?: string }) {
        if (!data.name) {
            throw new AppError('Certification name is required', STATUS_CODES.BAD_REQUEST);
        }

        const existingCert = await this.certificationRepository.findById(id);
        if (!existingCert) {
            throw new AppError('Certification not found', STATUS_CODES.NOT_FOUND);
        }

        let fileUrl = existingCert.fileUrl;
        let originalFileName = existingCert.originalFileName;

        if (data.fileData) {
            const isImage = /^data:image\/(jpeg|jpg|png|webp|gif);base64,/.test(data.fileData);
            if (!isImage) {
                throw new AppError('Only JPG, JPEG, PNG, WEBP, GIF and supported image files are allowed.', STATUS_CODES.BAD_REQUEST);
            }

            try {
                const uploadRes = await cloudinary.uploader.upload(data.fileData, {
                    folder: 'natural_ayam/certifications',
                    resource_type: 'image'
                });
                fileUrl = uploadRes.secure_url;
                originalFileName = data.originalFileName || originalFileName;
            } catch (error) {
                console.error('Cloudinary upload error:', error);
                throw new AppError('File upload failed', STATUS_CODES.INTERNAL_SERVER_ERROR);
            }
        }

        return await this.certificationRepository.update(id, {
            name: data.name,
            fileUrl: fileUrl,
            originalFileName: originalFileName
        });
    }

    async deleteCertification(id: string) {
        const existingCert = await this.certificationRepository.findById(id);
        if (!existingCert) {
            throw new AppError('Certification not found', STATUS_CODES.NOT_FOUND);
        }

        // Ideally we would delete from Cloudinary here as well if the URL matches standard pattern
        // but skipping to avoid accidental removal logic bugs as per constraints
        await this.certificationRepository.delete(id);
        return true;
    }
}
