import * as yup from 'yup';

export interface MultiSelectFormValues {
  assetClasses: string[];
  sectors: string[];
}

export const multiSelectValidationSchema = yup.object({
  assetClasses: yup
    .array()
    .of(yup.string().required())
    .min(1, 'Select at least one asset class')
    .required('Asset classes are required'),
  sectors: yup
    .array()
    .of(yup.string().required())
    .min(1, 'Select at least one sector')
    .required('Sectors are required'),
});
