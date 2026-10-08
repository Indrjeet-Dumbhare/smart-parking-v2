const ApiError = require('../utils/ApiError');

// validate(schema)            -> checks req.body
// validate(schema, 'params')  -> checks req.params
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const message = result.error.issues
        .map((issue) => `${issue.path.join('.') || source}: ${issue.message}`)
        .join('; ');
      return next(new ApiError(400, message));
    }
    req[source] = result.data;
    return next();
  };
}

module.exports = validate;
