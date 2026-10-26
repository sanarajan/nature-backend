import { inject, injectable } from 'tsyringe';
import { IBlogRepository } from '../../../domain/repositories/IBlogRepository';
import cloudinary from '../../../infrastructure/config/cloudinary';
import { AppError } from '../../../shared/utils/AppError';
import { STATUS_CODES } from '../../../shared/constants/statusCodes';

/**
 * Safely extracts the Cloudinary public_id for a blog cover image.
 * Ensures the target belongs to the 'natural_ayam/blogs' folder.
 */
function extractBlogImagePublicId(url?: string): string | null {
    if (!url || typeof url !== 'string') return null;
    try {
        if (!url.includes('res.cloudinary.com')) return null;
        const match = url.match(/\/image\/upload\/(?:v\d+\/)?(natural_ayam\/blogs\/[^.?#]+)(?:\.[a-zA-Z0-9]+)?/);
        if (match && match[1]) {
            return decodeURIComponent(match[1]);
        }
    } catch {
        return null;
    }
    return null;
}

const isBase64Image = (str?: string): boolean => {
    if (!str || typeof str !== 'string') return false;
    return /^data:image\/(jpeg|jpg|png|webp|gif|svg\+xml);base64,/.test(str);
};

@injectable()
export class AdminBlogUseCases {
    constructor(
        @inject('IBlogRepository') private blogRepository: IBlogRepository
    ) {}

    async addBlog(data: {
        title: string;
        content?: string;
        description?: string;
        imageUrl?: string;
        image?: string;
        fileData?: string;
        status?: 'active' | 'inactive';
    }) {
        const trimmedTitle = typeof data.title === 'string' ? data.title.trim() : '';
        if (!trimmedTitle) {
            throw new AppError('Blog title is required and cannot be empty or whitespace only.', STATUS_CODES.BAD_REQUEST);
        }

        const rawContent = data.content !== undefined ? data.content : data.description;
        const trimmedContent = typeof rawContent === 'string' ? rawContent.trim() : '';
        if (!trimmedContent) {
            throw new AppError('Blog content/description is required.', STATUS_CODES.BAD_REQUEST);
        }

        // Determine image source
        const incomingFile = data.fileData || (isBase64Image(data.imageUrl) ? data.imageUrl : (isBase64Image(data.image) ? data.image : ''));
        const incomingUrl = (!isBase64Image(data.imageUrl) && data.imageUrl) || (!isBase64Image(data.image) && data.image) || '';

        if (!incomingFile && !incomingUrl) {
            throw new AppError('Blog cover image is required.', STATUS_CODES.BAD_REQUEST);
        }

        let imageUrl = incomingUrl;
        let imagePublicId = '';

        if (incomingFile) {
            if (!isBase64Image(incomingFile)) {
                throw new AppError('Only JPG, JPEG, PNG, WEBP, GIF, and SVG image files are allowed.', STATUS_CODES.BAD_REQUEST);
            }

            try {
                const uploadRes = await cloudinary.uploader.upload(incomingFile, {
                    folder: 'natural_ayam/blogs',
                    resource_type: 'image'
                });
                imageUrl = uploadRes.secure_url;
                imagePublicId = uploadRes.public_id;
            } catch (error) {
                console.error('Cloudinary blog image upload error:', error);
                throw new AppError('Blog image upload failed', STATUS_CODES.INTERNAL_SERVER_ERROR);
            }
        }

        const status = data.status === 'inactive' ? 'inactive' : 'active';

        try {
            const newBlog = await this.blogRepository.create({
                title: trimmedTitle,
                content: trimmedContent,
                imageUrl,
                imagePublicId,
                status
            });
            return newBlog;
        } catch (dbError) {
            // Clean up uploaded image if database save fails
            if (imagePublicId) {
                try {
                    await cloudinary.uploader.destroy(imagePublicId);
                } catch {}
            }
            throw dbError;
        }
    }

    async getAllBlogs() {
        return await this.blogRepository.findAll();
    }

    async getBlogById(id: string) {
        const blog = await this.blogRepository.findById(id);
        if (!blog) {
            throw new AppError('Blog not found', STATUS_CODES.NOT_FOUND);
        }
        return blog;
    }

    async editBlog(id: string, data: {
        title?: string;
        content?: string;
        description?: string;
        imageUrl?: string;
        image?: string;
        fileData?: string;
        status?: 'active' | 'inactive';
    }) {
        const existingBlog = await this.blogRepository.findById(id);
        if (!existingBlog) {
            throw new AppError('Blog not found', STATUS_CODES.NOT_FOUND);
        }

        let title = existingBlog.title;
        if (data.title !== undefined) {
            const trimmed = data.title.trim();
            if (!trimmed) {
                throw new AppError('Blog title cannot be empty.', STATUS_CODES.BAD_REQUEST);
            }
            title = trimmed;
        }

        let content = existingBlog.content;
        const rawContent = data.content !== undefined ? data.content : data.description;
        if (rawContent !== undefined) {
            const trimmed = rawContent.trim();
            if (!trimmed) {
                throw new AppError('Blog content cannot be empty.', STATUS_CODES.BAD_REQUEST);
            }
            content = trimmed;
        }

        let status = existingBlog.status;
        if (data.status !== undefined) {
            status = data.status === 'inactive' ? 'inactive' : 'active';
        }

        let imageUrl = existingBlog.imageUrl;
        let imagePublicId = existingBlog.imagePublicId;
        const oldImagePublicId = existingBlog.imagePublicId || extractBlogImagePublicId(existingBlog.imageUrl);

        let newImageUploaded = false;
        let newImagePublicId: string | null = null;

        const incomingFile = data.fileData || (isBase64Image(data.imageUrl) ? data.imageUrl : (isBase64Image(data.image) ? data.image : ''));

        if (incomingFile) {
            if (!isBase64Image(incomingFile)) {
                throw new AppError('Only JPG, JPEG, PNG, WEBP, GIF, and SVG image files are allowed.', STATUS_CODES.BAD_REQUEST);
            }

            try {
                const uploadRes = await cloudinary.uploader.upload(incomingFile, {
                    folder: 'natural_ayam/blogs',
                    resource_type: 'image'
                });
                imageUrl = uploadRes.secure_url;
                imagePublicId = uploadRes.public_id;
                newImagePublicId = uploadRes.public_id;
                newImageUploaded = true;
            } catch (error) {
                console.error('Cloudinary blog image upload error:', error);
                throw new AppError('Blog image upload failed', STATUS_CODES.INTERNAL_SERVER_ERROR);
            }
        } else if (data.imageUrl && !isBase64Image(data.imageUrl)) {
            imageUrl = data.imageUrl;
        } else if (data.image && !isBase64Image(data.image)) {
            imageUrl = data.image;
        }

        try {
            const updated = await this.blogRepository.update(id, {
                title,
                content,
                imageUrl,
                imagePublicId,
                status
            });

            // If a new image was uploaded and replacement succeeded, clean up old image
            if (newImageUploaded && oldImagePublicId) {
                try {
                    await cloudinary.uploader.destroy(oldImagePublicId);
                } catch (cleanupErr) {
                    console.error('Failed to cleanup old blog image:', cleanupErr);
                }
            }

            return updated;
        } catch (dbError) {
            // Clean up newly uploaded image if database update fails
            if (newImageUploaded && newImagePublicId) {
                try {
                    await cloudinary.uploader.destroy(newImagePublicId);
                } catch {}
            }
            throw dbError;
        }
    }

    async deleteBlog(id: string) {
        const existingBlog = await this.blogRepository.findById(id);
        if (!existingBlog) {
            throw new AppError('Blog not found', STATUS_CODES.NOT_FOUND);
        }

        const publicId = existingBlog.imagePublicId || extractBlogImagePublicId(existingBlog.imageUrl);
        const deleted = await this.blogRepository.delete(id);

        if (publicId) {
            try {
                await cloudinary.uploader.destroy(publicId);
            } catch (cleanupErr) {
                console.error('Failed to delete blog image from Cloudinary:', cleanupErr);
            }
        }

        return deleted;
    }

    async toggleBlogStatus(id: string, newStatus?: 'active' | 'inactive') {
        const existingBlog = await this.blogRepository.findById(id);
        if (!existingBlog) {
            throw new AppError('Blog not found', STATUS_CODES.NOT_FOUND);
        }

        const targetStatus: 'active' | 'inactive' = newStatus
            ? (newStatus === 'active' ? 'active' : 'inactive')
            : (existingBlog.status === 'active' ? 'inactive' : 'active');

        const updated = await this.blogRepository.update(id, {
            status: targetStatus
        });

        return updated;
    }
}
