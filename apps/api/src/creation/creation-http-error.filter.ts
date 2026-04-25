import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from "@nestjs/common";
import { GenerationJobNotFoundError } from "./generation-job.js";

interface JsonResponse {
  readonly status: (statusCode: number) => {
    readonly json: (body: unknown) => void;
  };
}

@Catch(GenerationJobNotFoundError)
export class CreationHttpErrorFilter implements ExceptionFilter<GenerationJobNotFoundError> {
  catch(exception: GenerationJobNotFoundError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<JsonResponse>();
    response.status(HttpStatus.NOT_FOUND).json({
      error: exception.name,
      message: exception.message,
    });
  }
}
