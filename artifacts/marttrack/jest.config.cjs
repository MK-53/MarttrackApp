module.exports = {
  preset: "jest-expo",
  setupFiles: ["<rootDir>/jest.setup.cjs"],
  testMatch: ["<rootDir>/legacy/src/**/*.ui.test.jsx"],
};