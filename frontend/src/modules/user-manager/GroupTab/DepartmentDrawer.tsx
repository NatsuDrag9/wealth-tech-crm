import { useEffect, type ReactElement } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Drawer } from '../Drawer/Drawer';
import { FormInput, FormTextArea } from '@/components/form-inputs';
import { MainButton } from '@/components/buttons';
import {
  useCreateGroupMutation,
  useUpdateGroupMutation,
} from '@/services/api/userManagerApi';
import type { GroupRecord } from '@/definitions/userManagerTypes';
import { showSuccessToast, showErrorToast } from '@/utils/toastUtils';
import './DepartmentDrawer.scss';

interface DepartmentFormData {
  name: string;
  description?: string;
}

interface DepartmentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  departmentToEdit?: GroupRecord | null;
}

const departmentSchema = yup.object({
  name: yup
    .string()
    .trim()
    .required('Department name is required'),
  description: yup
    .string()
    .trim()
    .optional(),
});

export function DepartmentDrawer({
  isOpen,
  onClose,
  departmentToEdit = null,
}: DepartmentDrawerProps): ReactElement | null {
  const [createGroup, { isLoading: isCreating }] = useCreateGroupMutation();
  const [updateGroup, { isLoading: isUpdating }] = useUpdateGroupMutation();

  const methods = useForm<DepartmentFormData>({
    resolver: yupResolver(departmentSchema),
    defaultValues: {
      name: '',
      description: '',
    },
    mode: 'onBlur',
  });

  useEffect(() => {
    if (!isOpen) return;

    if (departmentToEdit) {
      methods.reset({
        name: departmentToEdit.name || '',
        description: departmentToEdit.description || '',
      });
    } else {
      methods.reset({
        name: '',
        description: '',
      });
    }
  }, [isOpen, departmentToEdit, methods]);

  async function onSubmit(data: DepartmentFormData) {
    try {
      if (departmentToEdit) {
        await updateGroup({
          id: departmentToEdit.id,
          name: data.name,
          description: data.description || '',
        }).unwrap();
        showSuccessToast('Department updated successfully');
      } else {
        await createGroup({
          name: data.name,
          description: data.description || '',
        }).unwrap();
        showSuccessToast('Department created successfully');
      }
      onClose();
    } catch {
      showErrorToast('Failed to save department. Please try again.');
    }
  }

  const isSubmitting = isCreating || isUpdating;
  const drawerTitle = departmentToEdit ? 'Edit Department' : 'Add Department';
  const drawerSubtitle = departmentToEdit
    ? 'Update department name and functional description'
    : 'Establish a new organizational department';

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={drawerTitle}
      subtitle={drawerSubtitle}
      id="department-drawer"
      footer={(
        <div className="department-drawer-form__footer-actions">
          <MainButton
            label="Cancel"
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isSubmitting}
          />
          <MainButton
            label={departmentToEdit ? 'Save Changes' : 'Create Department'}
            variant="primary"
            size="md"
            type="submit"
            formId="department-form"
            isLoading={isSubmitting}
          />
        </div>
      )}
    >
      <FormProvider {...methods}>
        <form
          id="department-form"
          onSubmit={methods.handleSubmit(onSubmit)}
          className="department-drawer-form"
          noValidate
        >
          <FormInput
            name="name"
            label="Department Name"
            placeholder="e.g. Wealth Advisory"
            id="department-drawer-name"
          />

          <FormTextArea
            name="description"
            label="Description (Optional)"
            placeholder="Describe the department's mandate and scope..."
            id="department-drawer-description"
          />
        </form>
      </FormProvider>
    </Drawer>
  );
}
