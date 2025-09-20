export interface LPOValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface LPOData {
  supplier_id: string;
  lpo_date: string;
  items: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
    description: string;
  }>;
}

export const validateLPO = (data: LPOData): LPOValidationResult => {
  const errors: string[] = [];

  // Check required fields
  if (!data.supplier_id) {
    errors.push('Supplier is required');
  }

  if (!data.lpo_date) {
    errors.push('LPO date is required');
  }

  if (!data.items || data.items.length === 0) {
    errors.push('At least one item is required');
  }

  // Validate LPO date
  if (data.lpo_date) {
    const lpoDate = new Date(data.lpo_date);
    const today = new Date();
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(today.getFullYear() + 1);

    if (lpoDate < new Date('2020-01-01')) {
      errors.push('LPO date cannot be before 2020');
    }

    if (lpoDate > oneYearFromNow) {
      errors.push('LPO date cannot be more than one year in the future');
    }
  }

  // Validate items
  if (data.items && data.items.length > 0) {
    data.items.forEach((item, index) => {
      const itemPrefix = `Item ${index + 1}:`;

      if (!item.product_id) {
        errors.push(`${itemPrefix} Product selection is required`);
      }

      if (!item.description || item.description.trim().length === 0) {
        errors.push(`${itemPrefix} Description is required`);
      }

      if (item.quantity <= 0) {
        errors.push(`${itemPrefix} Quantity must be greater than 0`);
      }

      if (item.quantity > 999999) {
        errors.push(`${itemPrefix} Quantity cannot exceed 999,999`);
      }

      if (item.unit_price < 0) {
        errors.push(`${itemPrefix} Unit price cannot be negative`);
      }

      if (item.unit_price > 99999999) {
        errors.push(`${itemPrefix} Unit price cannot exceed 99,999,999`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateLPOEdit = (data: LPOData & { status: string }): LPOValidationResult => {
  const baseValidation = validateLPO(data);

  // Additional validations for editing
  const errors = [...baseValidation.errors];

  // Check if LPO can be edited based on status
  if (data.status === 'received') {
    errors.push('Cannot edit a received LPO');
  }

  if (data.status === 'cancelled') {
    errors.push('Cannot edit a cancelled LPO');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};
