import * as React from 'react';
import { Button as BaseButton } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from './cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:pointer-events-none data-[disabled]:pointer-events-none cursor-pointer',
  {
    variants: {
      variant: {
        primary:
          'bg-indigo-700 text-white shadow-md hover:bg-indigo-500 hover:shadow-lg disabled:bg-neutral-200 disabled:text-neutral-600 disabled:shadow-none data-[disabled]:bg-neutral-200 data-[disabled]:text-neutral-600 data-[disabled]:shadow-none',
        secondary:
          'bg-neutral-100 text-neutral-900 border border-neutral-300 hover:bg-neutral-200 disabled:bg-neutral-100 disabled:text-neutral-400',
        ghost:
          'bg-transparent text-neutral-700 hover:bg-neutral-100 disabled:text-neutral-400',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-7 px-3 py-1.5 text-xs',
        lg: 'h-11 px-6 py-3',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
      fullWidth: true,
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  children: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, loading = false, disabled, children, ...props }, ref) => {
    return (
      <BaseButton
        className={cn(
          buttonVariants({ variant, size, fullWidth, className }),
          loading && 'bg-neutral-200 text-neutral-600 shadow-none',
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </BaseButton>
    );
  },
);

Button.displayName = 'Button';

export { Button, buttonVariants };
