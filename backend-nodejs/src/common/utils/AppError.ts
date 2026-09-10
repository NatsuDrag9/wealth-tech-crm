export class AppError extends Error {
    public readonly statusCode: number; // Attaches HTTP status codes
    public readonly isOperational: boolean; // Identifies whether errors are operational (bussiness logic) or programming 

    constructor(message: string, statusCode: number = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}