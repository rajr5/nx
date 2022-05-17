const nxPreset = require('@nrwl/jest/preset').default;

export default {
  ...nxPreset,
  displayName: 'nx-dev-ui-sponsor-card',

  transform: {
    '^.+\\.[tj]sx?$': ['babel-jest', { presets: ['@nrwl/next/babel'] }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../coverage/nx-dev/ui-sponsor-card',
  setupFilesAfterEnv: ['<rootDir>/test-setup.ts'],
  preset: '../../jest.preset.js',
};
