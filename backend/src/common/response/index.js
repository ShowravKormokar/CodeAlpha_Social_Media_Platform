export function successResponse(data, message = 'Request successful') {
  return {
    success: true,
    data,
    message,
  };
}

export function paginatedResponse(data, pagination, message = 'Request successful') {
  return {
    success: true,
    data,
    pagination,
    message,
  };
}

export function errorResponse(code, message, details = null) {
  const response = {
    success: false,
    error: {
      code,
      message,
    },
  };
  if (details) {
    response.error.details = details;
  }
  return response;
}