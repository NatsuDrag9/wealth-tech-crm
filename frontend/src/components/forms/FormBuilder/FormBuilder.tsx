import type { ReactElement } from 'react';
import { useForm, FormProvider, type FieldValues } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { MainButton } from '@/components/buttons';
import {
  FormInput,
  FormTextArea,
  SingleSelectDropdown,
  MultiSelectDropdown,
} from '@/components/form-inputs';
import type { FormBuilderProps, FormFieldConfig } from './types';
import { DEFAULT_SUBMIT_TEXT, DEFAULT_CANCEL_TEXT } from './constants';
import './FormBuilder.scss';

function renderField(field: FormFieldConfig): ReactElement {
  switch (field.fieldType) {
    case 'input':
      return (
        <FormInput
          name={field.name}
          label={field.label}
          type={field.inputType}
          placeholder={field.placeholder}
          disabled={field.disabled}
          id={field.id}
        />
      );
    case 'textarea':
      return (
        <FormTextArea
          name={field.name}
          label={field.label}
          placeholder={field.placeholder}
          disabled={field.disabled}
          id={field.id}
        />
      );
    case 'select':
      return (
        <SingleSelectDropdown
          name={field.name}
          label={field.label}
          options={field.options}
          placeholder={field.placeholder}
          noDataMessage={field.noDataMessage}
          disabled={field.disabled}
          id={field.id}
        />
      );
    case 'multiselect':
      return (
        <MultiSelectDropdown
          name={field.name}
          label={field.label}
          options={field.options}
          placeholder={field.placeholder}
          noDataMessage={field.noDataMessage}
          disabled={field.disabled}
          id={field.id}
        />
      );
    default:
      return <span />;
  }
}

export function FormBuilder<T extends FieldValues>({
  id,
  fields,
  validationSchema,
  defaultValues,
  onSubmit,
  submitText = DEFAULT_SUBMIT_TEXT,
  cancelText = DEFAULT_CANCEL_TEXT,
  onCancel,
  isLoading = false,
  className = '',
}: FormBuilderProps<T>): ReactElement {
  const methods = useForm<T>({
    resolver: validationSchema ? yupResolver(validationSchema) : undefined,
    defaultValues,
    mode: 'onBlur',
  });

  return (
    <FormProvider {...methods}>
      <form
        id={id}
        onSubmit={methods.handleSubmit(onSubmit)}
        className={`form-builder ${className}`.trim()}
        noValidate
      >
        <div className="form-builder__grid">
          {fields.map((field) => {
            const colClass = field.colSpan === 2
              ? 'form-builder__field--col-2'
              : 'form-builder__field--col-1';

            return (
              <div
                key={field.name}
                className={`form-builder__field ${colClass}`}
              >
                {renderField(field)}
              </div>
            );
          })}
        </div>

        <div className="form-builder__actions">
          {onCancel ? (
            <MainButton
              type="button"
              variant="secondary"
              label={cancelText}
              onClick={onCancel}
              disabled={isLoading}
            />
          ) : null}

          <MainButton
            type="submit"
            variant="primary"
            label={submitText}
            isLoading={isLoading}
            disabled={isLoading}
          />
        </div>
      </form>
    </FormProvider>
  );
}
