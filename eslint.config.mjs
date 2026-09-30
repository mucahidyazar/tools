import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
export default defineConfig([
  ...nextVitals,
  globalIgnores(['.next/**', '.next-dev/**','node_modules/**','src/data/*.csv']),
  { rules: {
    'react-hooks/set-state-in-effect': 'off',
    'react/no-unescaped-entities': 'off',
    '@next/next/no-img-element': 'off',
    'import/no-anonymous-default-export': 'off',
  } },
])
