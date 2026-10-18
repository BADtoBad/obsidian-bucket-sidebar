import obsidianmd from 'eslint-plugin-obsidianmd';

export default [
  ...obsidianmd.configs.recommended,
  { languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } } },
];
