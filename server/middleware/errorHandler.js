export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || 500;

  return res.status(status).json({
    success: false,
    provider: err.provider || undefined,
    code: err.code || "INTERNAL_ERROR",
    reconnectRequired: Boolean(err.reconnectRequired),
    error: err.publicError || "Something went wrong.",
    message: err.message || "Unexpected server error."
  });
}
