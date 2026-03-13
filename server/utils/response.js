export function successResponse(data, message = 'Success') {
  return {
    success: true,
    message,
    data
  };
}

export function errorResponse(message, status = 500, errors = null) {
  const response = {
    success: false,
    message
  };
  
  if (errors) response.errors = errors;
  
  return { response, status };
}

export function paginatedResponse(data, page, limit, total) {
  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}
