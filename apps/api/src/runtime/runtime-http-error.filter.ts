import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from "@nestjs/common";
import {
  RuntimeConflictError,
  RuntimeNotFoundError,
  RuntimeRuleError,
} from "./runtime-errors.js";

type RuntimeHttpError = RuntimeConflictError | RuntimeNotFoundError | RuntimeRuleError;
type JsonResponse = {
  readonly status: (statusCode: number) => {
    readonly json: (body: unknown) => void;
  };
};

@Catch(RuntimeConflictError, RuntimeNotFoundError, RuntimeRuleError)
export class RuntimeHttpErrorFilter implements ExceptionFilter<RuntimeHttpError> {
  catch(exception: RuntimeHttpError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<JsonResponse>();
    response.status(statusForError(exception)).json({
      error: exception.name,
      message: exception.message,
    });
  }
}

function statusForError(error: RuntimeHttpError): number {
  if (error instanceof RuntimeNotFoundError) {
    return HttpStatus.NOT_FOUND;
  }

  return HttpStatus.CONFLICT;
}
