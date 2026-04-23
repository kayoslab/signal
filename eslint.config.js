import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['google-analytics*'], message: 'Analytics SDKs are banned by architecture policy.' },
            { group: ['@segment*'], message: 'Analytics SDKs are banned by architecture policy.' },
            { group: ['mixpanel*'], message: 'Analytics SDKs are banned by architecture policy.' },
            { group: ['hotjar*'], message: 'Analytics SDKs are banned by architecture policy.' },
            { group: ['amplitude*'], message: 'Analytics SDKs are banned by architecture policy.' },
            { group: ['posthog*'], message: 'Analytics SDKs are banned by architecture policy.' },
            { group: ['fullstory*'], message: 'Analytics SDKs are banned by architecture policy.' },
            { group: ['logrocket*'], message: 'Analytics SDKs are banned by architecture policy.' },
            { group: ['facebook-pixel*'], message: 'Tracking scripts are banned by architecture policy.' },
            { group: ['google-tag-manager*'], message: 'Tracking scripts are banned by architecture policy.' },
            { group: ['gtag*'], message: 'Tracking scripts are banned by architecture policy.' },
            { group: ['express', 'express/*'], message: 'Backend dependencies are banned by architecture policy.' },
            { group: ['fastify', 'fastify/*'], message: 'Backend dependencies are banned by architecture policy.' },
            { group: ['koa', 'koa/*'], message: 'Backend dependencies are banned by architecture policy.' },
            { group: ['next', 'next/*'], message: 'Backend dependencies are banned by architecture policy.' },
            { group: ['nuxt', 'nuxt/*'], message: 'Backend dependencies are banned by architecture policy.' },
            { group: ['@nestjs*'], message: 'Backend dependencies are banned by architecture policy.' },
          ],
        },
      ],
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
);
