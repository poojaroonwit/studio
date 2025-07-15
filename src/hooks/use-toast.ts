import { toast, ToastOptions } from 'react-hot-toast';

interface ToastWithDescriptionOptions extends ToastOptions {
  description?: string;
}

export function useToast() {
  // Show a toast with a message and optional options
  const show = (message: string, options?: ToastOptions) => {
    toast(message, options);
  };

  // Show a success toast
  const success = (message: string, options?: ToastOptions) => {
    toast.success(message, options);
  };

  // Show an error toast
  const error = (message: string, options?: ToastOptions) => {
    toast.error(message, options);
  };

  // Show a loading toast
  const loading = (message: string, options?: ToastOptions) => {
    toast.loading(message, options);
  };

  /**
   * Show a toast with title and description
   * @param title - The main title of the toast
   * @param description - Optional description text below the title
   * @param options - Optional toast configuration
   * 
   * @example
   * ```tsx
   * const { showWithDescription } = useToast();
   * showWithDescription("File Uploaded", "Your document has been successfully processed.");
   * ```
   */
  const showWithDescription = (title: string, description?: string, options?: ToastWithDescriptionOptions) => {
    const message = description ? `${title}\n${description}` : title;
    toast(message, options);
  };

  /**
   * Show a success toast with title and description
   * @param title - The main title of the toast
   * @param description - Optional description text below the title
   * @param options - Optional toast configuration
   * 
   * @example
   * ```tsx
   * const { successWithDescription } = useToast();
   * successWithDescription("Success!", "Your changes have been saved successfully.");
   * ```
   */
  const successWithDescription = (title: string, description?: string, options?: ToastWithDescriptionOptions) => {
    const message = description ? `${title}\n${description}` : title;
    toast.success(message, options);
  };

  /**
   * Show an error toast with title and description
   * @param title - The main title of the toast
   * @param description - Optional description text below the title
   * @param options - Optional toast configuration
   * 
   * @example
   * ```tsx
   * const { errorWithDescription } = useToast();
   * errorWithDescription("Upload Failed", "Please check your connection and try again.");
   * ```
   */
  const errorWithDescription = (title: string, description?: string, options?: ToastWithDescriptionOptions) => {
    const message = description ? `${title}\n${description}` : title;
    toast.error(message, options);
  };

  // Dismiss all toasts
  const dismiss = () => {
    toast.dismiss();
  };

  return { 
    show, 
    success, 
    error, 
    loading, 
    showWithDescription,
    successWithDescription,
    errorWithDescription,
    dismiss 
  };
} 