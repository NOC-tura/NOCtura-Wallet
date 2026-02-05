module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages', '<rootDir>/apps', '<rootDir>/backend'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: false,
    }],
    '^.+\\.m?js$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/.pnpm/(?!(@noble|@scure|bs58))',
  ],
  moduleNameMapper: {
    '^@noctura/core$': '<rootDir>/packages/core/src/index.ts',
    '^@noctura/zk-proofs$': '<rootDir>/packages/zk-proofs/src/index.ts',
    '^@noctura/compliance$': '<rootDir>/packages/compliance/src/index.ts',
  },
  collectCoverageFrom: [
    '**src/**/*.ts',
    '!**node_modules**',
    '!**dist/**',
    '!**coverage/**',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};
