module.exports = {
    preset: "ts-jest",
    testEnvironment: "jest-environment-jsdom",
    roots: ['<rootDir>/tests'],
    testMatch: ['**/*.test.ts', '**/*.test.tsx'],
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                tsconfig: './tsconfig.app.json'
            }
        ]
    },
    moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
    },
    verbose: true,
    collectCoverage: true,
    collectCoverageFrom: ['!tests/*', '!**/dist/**/*', '!tests/**/*'],
    coverageReporters: ['json-summary', 'text']
};