export function validateQuery(schema) {
  return (request, response, next) => {
    const result = schema.safeParse(request.query);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      return response.status(422).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "The query parameters contain invalid data.",
          details,
        },
      });
    }

    request.validatedQuery = result.data;
    next();
  };
}
