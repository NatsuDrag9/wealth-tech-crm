import toast from 'react-hot-toast';

export const showSuccessToast = (message: string): string => toast.success(message, {
  duration: 3000,
  position: 'top-right',
});

export const showErrorToast = (message: string): string => toast.error(message, {
  duration: 4000,
  position: 'top-right',
});

export const showInfoToast = (message: string): string => toast(message, {
  duration: 3000,
  position: 'top-right',
  icon: 'ℹ️',
});
