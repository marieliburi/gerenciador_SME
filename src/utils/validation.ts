import type { TaskFormData } from '@/types';

export function validateTaskTitle(title: string): { valid: boolean; error?: string } {
  const trimmed = title.trim();
  if (!trimmed) {
    return { valid: false, error: 'O título é obrigatório.' };
  }
  if (trimmed.length > 500) {
    return { valid: false, error: 'O título deve ter no máximo 500 caracteres.' };
  }
  return { valid: true };
}

export function validateTaskForm(data: TaskFormData): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  const titleValidation = validateTaskTitle(data.title);
  if (!titleValidation.valid && titleValidation.error) {
    errors.title = titleValidation.error;
  }

  if (!data.category) {
    errors.category = 'A categoria é obrigatória.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function sanitizeText(text: string): string {
  return text.trim();
}
