import { HttpException, HttpStatus } from '@nestjs/common';

export class ResourceNotFoundException extends HttpException {
    constructor(resource: string, id?: string | number) {
        super(
            {
                statusCode: HttpStatus.NOT_FOUND,
                error: 'Not Found',
                message: id
                    ? `${resource} with id '${id.toString()}' not found`
                    : `${resource} not found`,
            },
            HttpStatus.NOT_FOUND,
        );
    }
}

export class ResourceAlreadyExistsException extends HttpException {
    constructor(resource: string, field: string, value: string) {
        super(
            {
                statusCode: HttpStatus.CONFLICT,
                error: 'Conflict',
                message: `${resource} with ${field} '${value}' already exists`,
            },
            HttpStatus.CONFLICT,
        );
    }
}

export class UnauthorizedException extends HttpException {
    constructor(message = 'Unauthorized') {
        super(
            {
                statusCode: HttpStatus.UNAUTHORIZED,
                error: 'Unauthorized',
                message,
            },
            HttpStatus.UNAUTHORIZED,
        );
    }
}

export class ForbiddenException extends HttpException {
    constructor(message = 'Forbidden resource') {
        super(
            {
                statusCode: HttpStatus.FORBIDDEN,
                error: 'Forbidden',
                message,
            },
            HttpStatus.FORBIDDEN,
        );
    }
}

export class BadRequestException extends HttpException {
    constructor(message: string, errors?: Record<string, string[]>) {
        super(
            {
                statusCode: HttpStatus.BAD_REQUEST,
                error: 'Bad Request',
                message,
                ...(errors && { errors }),
            },
            HttpStatus.BAD_REQUEST,
        );
    }
}
