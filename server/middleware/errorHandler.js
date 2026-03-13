export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function errorHandler(err, req, res, next) {
  console.error('Unhandled error:', err.message);
  
  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'development' ? err.message : 'Internal server error';
  
  res.status(status).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
}
