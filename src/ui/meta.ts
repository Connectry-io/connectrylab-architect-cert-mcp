export const QUIZ_WIDGET_URI = 'ui://connectry-architect/quiz';

export function buildQuizMeta(): {
  readonly 'ui/resourceUri': string;
  readonly ui: { readonly resourceUri: string };
} {
  return {
    'ui/resourceUri': QUIZ_WIDGET_URI,
    ui: { resourceUri: QUIZ_WIDGET_URI },
  };
}
