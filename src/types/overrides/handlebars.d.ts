// Custom handlebars type definitions to resolve conflicts
// This will override the conflicting definitions from @types/handlebars
declare module 'handlebars' {
  export * from 'handlebars/types';
}