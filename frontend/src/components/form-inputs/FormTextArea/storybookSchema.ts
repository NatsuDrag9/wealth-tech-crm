import * as yup from 'yup';

export interface TextAreaFormValues {
  notes: string;
  summary: string;
}

export const textAreaValidationSchema = yup.object({
  notes: yup.string().required('Notes are required'),
  summary: yup.string().required('Summary is required'),
});
