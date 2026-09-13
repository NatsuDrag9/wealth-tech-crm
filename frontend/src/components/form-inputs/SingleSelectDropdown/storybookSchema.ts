import * as yup from 'yup';

export interface DropdownFormValues {
  riskProfile: string;
  investmentTier: string;
}

export const dropdownValidationSchema = yup.object({
  riskProfile: yup.string().required('Risk profile is required'),
  investmentTier: yup.string().required('Investment tier is required'),
});
