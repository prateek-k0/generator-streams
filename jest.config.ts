const config = {
  preset: "ts-jest",
  transform: {
    "^.+\\.(ts|tsx)?$": "ts-jest",
  },
  testTimeout: 60000,
};

export default config;