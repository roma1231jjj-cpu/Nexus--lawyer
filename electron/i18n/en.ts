import type { MainKey } from './ru';

export const en: Record<MainKey, string> = {
  'prompt.role': 'You are Nexus-Lawyer — the legal assistant of the Nexus × АутSquad ecosystem.',
  'prompt.answerRu': 'Answer in Russian.',
  'prompt.answerEn': 'Answer in English.',
  'prompt.answerDe': 'Answer in German.',
  'prompt.country': 'Default legal system: {country} ({code}).',
  'prompt.structure': 'Answer structure: a short conclusion, then the legal reasoning with references to norms, then practical steps and risks.',
  'prompt.cite':
    'Reference the excerpts as [1], [2]. Never invent article numbers: if a norm is not in the excerpts, say plainly that the current wording must be checked.',
  'prompt.disclaimer': 'End with the line: "This is reference information, not legal advice."',
  'prompt.context': 'Excerpts from the law database:\n{context}',
  'prompt.noContext': 'There are no excerpts for this query — answer from general principles and warn that the norm must be checked.',
  'prompt.style': 'Write tightly, no filler, up to 350 words. Formatting: markdown, short paragraphs, lists where useful.',

  'offline.head': '**Reference mode** (no model connected). Query: “{query}”.',
  'offline.noNorms':
    'The local database has no norms for this query. Connect a model in Settings (Ollama, llama.cpp or any OpenAI-compatible server) or import your own law pack in Laws.',
  'offline.system': 'Legal system: {country}.',
  'offline.found': 'Norms found:',
  'offline.actions':
    '**What to do:** pin down the facts (who, when, which documents), then check the current wording of the norm on the official portal. Use the Documents section to calculate deadlines and amounts.',
  'offline.disclaimer': 'This is reference information, not legal advice.',

  'ai.emptyModels': 'Empty model list',
  'ai.noLink': 'No connection to the model',
  'ai.noConnection': 'No connection to the model',

  'dialog.importTitle': 'Import a law pack',
  'dialog.importFilter': 'Law pack',
  'dialog.attachTitle': 'Add a file to the case',
  'dialog.saveDocTitle': 'Save the document',

  'idle.checking': 'Checking releases…',
  'idle.actual': 'You have the current version',
  'idle.downloaded': 'Update downloaded',
  'idle.noReleasesShort': 'no published releases on GitHub yet',
  'idle.noReleases': 'There are no releases on GitHub yet — updates appear after the first publication',
  'idle.silentFailed': 'silent check failed: {error}',
  'idle.dev': 'The update check works in the packaged build. Current: {version}',
  'idle.checkError': 'Check failed',
  'idle.noNetwork': 'no network',
  'idle.noReleasesShort2': 'no releases on GitHub yet',
  'idle.downloadError': 'Download failed',
  'idle.networkError': 'No network'
};
