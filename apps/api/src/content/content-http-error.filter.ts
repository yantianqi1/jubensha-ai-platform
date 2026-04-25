import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from "@nestjs/common";
import {
  ContentConflictError,
  ContentNotFoundError,
  ContentPublishBlockedError,
  ContentValidationError,
} from "./content-errors.js";

type ContentHttpError = ContentConflictError | ContentNotFoundError | ContentPublishBlockedError | ContentValidationError;
type JsonResponse = {
  readonly status: (statusCode: number) => {
    readonly json: (body: unknown) => void;
  };
};

@Catch(ContentConflictError, ContentNotFoundError, ContentPublishBlockedError, ContentValidationError)
export class ContentHttpErrorFilter implements ExceptionFilter<ContentHttpError> {
  catch(exception: ContentHttpError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<JsonResponse>();
    response.status(statusForError(exception)).json(bodyForError(exception));
  }
}

function statusForError(error: ContentHttpError): number {
  if (error instanceof ContentValidationError) {
    return HttpStatus.BAD_REQUEST;
  }

  if (error instanceof ContentConflictError) {
    return HttpStatus.CONFLICT;
  }

  if (error instanceof ContentPublishBlockedError) {
    return HttpStatus.CONFLICT;
  }

  return HttpStatus.NOT_FOUND;
}

function bodyForError(error: ContentHttpError): Record<string, unknown> {
  const body: Record<string, unknown> = {
    error: error.name,
    message: error.message,
  };

  if (error instanceof ContentValidationError) {
    return {
      ...body,
      diagnostics: error.diagnostics,
    };
  }

  if (error instanceof ContentPublishBlockedError) {
    return {
      ...body,
      blockers: error.blockers,
    };
  }

  return body;
}
