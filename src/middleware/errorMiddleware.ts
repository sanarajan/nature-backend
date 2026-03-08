import express, { Request, Response, NextFunction } from 'express';
import { ErrorMessages } from '../constants/messages/ErrorMessages';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || ErrorMessages.INTERNAL_SERVER_ERROR,
    });
};
