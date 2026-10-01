export type DocSection = 'overview' | 'install' | 'config' | 'tools' | 'flow' | 'security';

export const DOC_SECTIONS: Array<[DocSection, string]> = [
  ['overview', 'Overview'],
  ['install', 'Install'],
  ['config', 'Configuration'],
  ['tools', 'Tool reference'],
  ['flow', 'Payment flow'],
  ['security', 'Security'],
];
