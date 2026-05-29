/**
 * Thank — Stage 3. Final confirmation screen.
 */
import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '../ui/Button';
import { useWidgetContext } from '../../contexts/WidgetContext';
import type { Messages } from '../../i18n';

interface ThankProps {
  messages: Messages;
}

export const Thank = ({ messages }: ThankProps) => {
  const { reset } = useWidgetContext();
  const [visible, setVisible] = useState(false);
  const t = messages.thank;

  useEffect(() => {
    setTimeout(() => setVisible(true), 50);
  }, []);

  return (
    <div
      className={`flex flex-col gap-4 text-center h-full py-2 transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="flex justify-center">
        <Heart className="h-12 w-12 text-red-400 fill-red-400" />
      </div>
      <h2 className="font-semibold text-neutral-900">{t.title}</h2>
      <p className="text-sm text-neutral-600">{t.subtitle}</p>
      <div className="flex grow h-full items-end">
        <Button variant="primary" onClick={reset}>
          {t.rateAgain}
        </Button>
      </div>
    </div>
  );
};
