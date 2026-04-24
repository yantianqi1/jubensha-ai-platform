import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from "@nestjs/common";
import { ContentNotFoundError } from "../content/content-errors.js";
import { RuntimeNotFoundError } from "../runtime/runtime-errors.js";
import { GenerationValidationError } from "./generation-errors.js";

@Catch(GenerationValidationError, RuntimeNotFoundError, ContentNotFoundError)
export class GenerationHttpErrorFilter implements ExceptionFilter {
  catch(error: GenerationValidationError | RuntimeNotFoundError | ContentNotFoundError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();

    response.status(readStatusCode(error)).json({
      error: error.name,
      message: error.message,
    });
  }
}

function readStatusCode(error: Error): number {
  if (error instanceof GenerationValidationError) {
    return HttpStatus.UNPROCESSABLE_ENTITY;
  }

  return HttpStatus.NOT_FOUND;
}
