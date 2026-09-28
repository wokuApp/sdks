import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Feedback } from '../../app/components/Feedback/Feedback';
import { getMessages } from '../../app/i18n';
import * as capture from '../../app/services/capture';

const context = vi.hoisted(() => ({
  config: {
    apiBaseUrl: 'https://api.test',
    publishableKey: 'pk_test',
    captureType: 'nps' as 'woku' | 'nps',
    collectionKind: 'flow' as const,
    flowId: 'f1',
  },
  qualification: 2,
  npsScore: 2,
  textnote: 'Slow service',
  setTextnote: vi.fn(),
  setNpsId: vi.fn(),
  setStep: vi.fn(),
  setEmail: vi.fn(),
  setAnonymous: vi.fn(),
}));
vi.mock('../../app/contexts/WidgetContext', () => ({
  useWidgetContext: () => context,
}));
vi.mock('../../app/services/capture', () => ({
  createNps: vi.fn(async () => ({ npsId: 'n1' })),
  createNpsTextnote: vi.fn(async () => ({})),
  createNpsVoicemail: vi.fn(async () => ({})),
  createWokuTextnote: vi.fn(async () => ({})),
  createWokuVoicemail: vi.fn(async () => ({})),
}));
afterEach(async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 60));
  });
  cleanup();
  vi.clearAllMocks();
});

it.each(['woku', 'nps'] as const)(
  'copies host flow provenance into the %s submission chain',
  async (captureType) => {
    context.config.captureType = captureType;
    const messages = getMessages('en');
    render(<Feedback messages={messages} />);
    fireEvent.click(
      screen.getByRole('button', { name: messages.feedback.send }),
    );
    await waitFor(() => expect(context.setStep).toHaveBeenCalledWith('thank'));
    const expected = expect.objectContaining({
      collectionKind: 'flow',
      flowId: 'f1',
    });
    if (captureType === 'woku')
      expect(capture.createWokuTextnote).toHaveBeenCalledWith(expected);
    else {
      expect(capture.createNps).toHaveBeenCalledWith(expected);
      expect(capture.createNpsTextnote).toHaveBeenCalledWith(expected);
    }
  },
);
