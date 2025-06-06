import { toast } from '@/hooks/use-toast';
import { ZodError } from 'zod';

// Form validation helper
export function handleFormError(error: unknown) {
  if (error instanceof ZodError) {
    const firstError = error.errors[0];
    toast({
      title: 'Validation Error',
      description: firstError.message,
      variant: 'destructive',
    });
    return;
  }

  if (error instanceof Error) {
    toast({
      title: 'Error',
      description: error.message,
      variant: 'destructive',
    });
    return;
  }

  toast({
    title: 'Error',
    description: 'An unexpected error occurred',
    variant: 'destructive',
  });
}

// Real-time validation helper
export function validateField<T>(schema: any, field: string, value: T): string | null {
  try {
    schema.pick({ [field]: true }).parse({ [field]: value });
    return null;
  } catch (error) {
    if (error instanceof ZodError) {
      return error.errors[0]?.message || 'Invalid value';
    }
    return 'Validation error';
  }
}

// Form submission validation wrapper
export async function validateAndSubmit<T>(
  schema: any,
  data: T,
  submitFn: (validatedData: T) => Promise<void>
): Promise<void> {
  try {
    const validatedData = schema.parse(data);
    await submitFn(validatedData);
  } catch (error) {
    handleFormError(error);
    throw error;
  }
}

// Input sanitization for client-side
export function sanitizeInput(value: string): string {
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .trim();
}

// Number validation helper
export function validateNumber(value: string, min?: number, max?: number): number | null {
  const num = parseFloat(value);
  if (isNaN(num) || !isFinite(num)) {
    return null;
  }
  if (min !== undefined && num < min) {
    return null;
  }
  if (max !== undefined && num > max) {
    return null;
  }
  return num;
}

// Email validation helper
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

// Phone validation helper
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

// Password strength checker
export function checkPasswordStrength(password: string): {
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score += 1;
  else feedback.push('Use at least 8 characters');

  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Include lowercase letters');

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Include uppercase letters');

  if (/\d/.test(password)) score += 1;
  else feedback.push('Include numbers');

  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
  else feedback.push('Include special characters');

  if (password.length >= 12) score += 1;

  return { score, feedback };
}

// File validation helper
export function validateFile(
  file: File,
  allowedTypes: string[],
  maxSize: number
): { valid: boolean; error?: string } {
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size too large. Maximum size: ${Math.round(maxSize / 1024 / 1024)}MB`
    };
  }

  return { valid: true };
}