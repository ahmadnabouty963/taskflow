export function validateBody(schema) {
  return function validateRequestBody(request, response, next) {
    const result = schema.safeParse(request.body);

    if (!result.success) {
      return response.status(422).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "The request body contains invalid data.",
          details: result.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
      });
    }

    request.body = result.data;

    next();
  };
}
