import { Toaster as SonnerToaster } from 'sonner';

/**
 * Toast notification container
 * Uses sonner library for toast notifications
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      expand={false}
      richColors
      closeButton
      theme="dark"
      toastOptions={{
        style: {
          background: '#1E293B',
          border: '1px solid #334155',
          color: '#F1F5F9',
        },
        className: 'sonner-toast',
      }}
    />
  );
}
