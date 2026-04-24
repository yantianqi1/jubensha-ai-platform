import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from "@nestjs/common";
import {
  RuntimeNotFoundError,
  RuntimeRuleError,
} from "./runtime-errors.js";

type RuntimeHttpError = RuntimeNotFoundError | RuntimeRuleError;
type JsonResponse = {
  readonly status: (statusCode: number) => {
    readonly json: (body: unknown) => void;
  };
};

@Catch(RuntimeNotFoundError, RuntimeRuleError)
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
  if (error instanceof RuntimeRuleError) {
    return HttpStatus.CONFLICT;
  }

  return HttpStatus.NOT_FOUND;
}
