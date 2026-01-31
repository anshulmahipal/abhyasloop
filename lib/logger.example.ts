import { logger } from './logger';

export function exampleUsage() {
  const userInfo = {
    id: '123',
    name: 'John Doe',
    email: 'john@example.com',
  };

  logger.userAction('Button Pressed', userInfo, { buttonId: 'start-quiz' });

  logger.apiCall('Fetch Questions', {
    url: '/api/questions',
    method: 'GET',
    params: { difficulty: 'medium', count: 5 },
    response: { questions: [] },
    duration: 250,
  });

  logger.apiCallAsync(
    'Submit Quiz Answer',
    async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return { success: true, score: 85 };
    },
    {
      url: '/api/quiz/submit',
      method: 'POST',
      body: { questionId: 1, answer: 'A' },
      userInfo,
    }
  );

  logger.group('Quiz Flow', () => {
    logger.info('Starting quiz');
    logger.debug('Question loaded', { questionId: 1 });
    logger.warn('Time running low', { remaining: 30 });
  });
}
