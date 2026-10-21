export function errorHandler(error, request, response, next) {
  // Body parser errors are client mistakes, not server failures.
  if (error.type === "entity.too.large") {
    return response.status(413).json({
      success: false,
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: "The request is too large.",
      },
    });
  }

  if (error.type === "entity.parse.failed") {
    return response.status(400).json({
      success: false,
      error: {
        code: "INVALID_JSON",
        message: "The request body is not valid JSON.",
      },
    });
  }

  console.error(error);

  return response.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred.",
    },
  });
}
