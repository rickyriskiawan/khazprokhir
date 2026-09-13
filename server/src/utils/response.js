/**
 * Standardized Response Formatter for Khazprokhir API
 */

/**
 * Send success JSON response
 * @param {import('express').Response} res
 * @param {object} options
 * @param {number} [options.status=200]
 * @param {string} [options.message='Success']
 * @param {any} [options.data=null]
 * @param {object} [options.meta=null]
 */
export function successResponse(res, { status = 200, message = 'Success', data = null, meta = null }) {
  const payload = {
    success: true,
    message,
    data,
  };

  if (meta !== null && meta !== undefined) {
    payload.meta = meta;
  }

  return res.status(status).json(payload);
}

/**
 * Send error JSON response
 * @param {import('express').Response} res
 * @param {object} options
 * @param {number} [options.status=500]
 * @param {string} [options.message='An error occurred']
 * @param {string} [options.error=null]
 * @param {any} [options.details=null]
 */
export function errorResponse(res, { status = 500, message = 'An error occurred', error = null, details = null }) {
  const payload = {
    success: false,
    message,
    error: error || (status >= 500 ? 'InternalServerError' : 'ClientError'),
  };

  if (details !== null && details !== undefined) {
    payload.details = details;
  }

  return res.status(status).json(payload);
}
