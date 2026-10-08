const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');

const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  res.json(await authService.login(username, password));
});

const me = (req, res) => {
  res.json({ user: req.user });
};

module.exports = { login, me };
