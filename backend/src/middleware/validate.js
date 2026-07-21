function validate(schema) {
  return (req, _res, next) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      req.parsed = parsed;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = validate;
