
import { useCallback } from 'react';
import { useToast } from './hooks/use-toast';

interface ErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
  fallbackAction?: () => void;
}

export function useErrorHandler(options: ErrorHandlerOptions = {}) {
  const { toast } = useToast();
  const { showToast = true, logError = true, fallbackAction } = options;

  const handleError = useCallback((error: Error, context?: string) => {
    if (logError) {
      console.error(`Error${context ? ` in ${context}` : ''}:`, error);
    }

    if (showToast) {
      toast({
        title: "Something went wrong",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }

    if (fallbackAction) {
      fallbackAction();
    }
  }, [toast, showToast, logError, fallbackAction]);

  const handleAsyncError = useCallback(async (
    asyncFn: () => Promise<any>,
    context?: string
  ) => {
    try {
      return await asyncFn();
    } catch (error) {
      handleError(error as Error, context);
      throw error; // Re-throw to allow caller to handle if needed
    }
  }, [handleError]);

  return { handleError, handleAsyncError };
}
