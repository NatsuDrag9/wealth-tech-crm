import { useEffect, type ReactElement } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Drawer } from '../Drawer/Drawer';
import { FormInput, FormTextArea } from '@/components/form-inputs';
import { MainButton } from '@/components/buttons';
import {
  useCreateRoleMutation,
  useUpdateRoleMutation,
} from '@/services/api/userManagerApi';
import type { RoleRecord } from '@/definitions/userManagerTypes';
import { showSuccessToast, showErrorToast } from '@/utils/toastUtils';
import './RoleDrawer.scss';

interface RoleFormData {
  name: string;
  description?: string;
}

interface RoleDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string | number;
  groupName?: string;
  roleToEdit?: RoleRecord | null;
}

const roleSchema = yup.object({
  name: yup
    .string()
    .trim()
    .required('Role title is required'),
  description: yup
    .string()
    .trim()
    .optional(),
});

export function RoleDrawer({
  isOpen,
  onClose,
  groupId,
  groupName = 'Department',
  roleToEdit = null,
}: RoleDrawerProps): ReactElement | null {
  const [createRole, { isLoading: isCreating }] = useCreateRoleMutation();
  const [updateRole, { isLoading: isUpdating }] = useUpdateRoleMutation();

  const methods = useForm<RoleFormData>({
    resolver: yupResolver(roleSchema),
    defaultValues: {
      name: '',
      description: '',
    },
    mode: 'onBlur',
  });

  useEffect(() => {
    if (!isOpen) return;

    if (roleToEdit) {
      methods.reset({
        name: roleToEdit.name || '',
        description: roleToEdit.description || '',
      });
    } else {
      methods.reset({
        name: '',
        description: '',
      });
    }
  }, [isOpen, roleToEdit, methods]);

  async function onSubmit(data: RoleFormData) {
    try {
      if (roleToEdit) {
        await updateRole({
          id: roleToEdit.id,
          name: data.name,
          description: data.description || '',
        }).unwrap();
        showSuccessToast('Role updated successfully');
      } else {
        await createRole({
          name: data.name,
          description: data.description || '',
          groupId,
        }).unwrap();
        showSuccessToast('Role created successfully');
      }
      onClose();
    } catch {
      showErrorToast('Failed to save role. Please try again.');
    }
  }

  const isSubmitting = isCreating || isUpdating;
  const drawerTitle = roleToEdit ? 'Edit Role' : 'Add Role';
  const drawerSubtitle = roleToEdit
    ? `Update job title and description in ${groupName}`
    : `Define a new operational role under ${groupName}`;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={drawerTitle}
      subtitle={drawerSubtitle}
      id="role-drawer"
      footer={(
        <div className="role-drawer-form__footer-actions">
          <MainButton
            label="Cancel"
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isSubmitting}
          />
          <MainButton
            label={roleToEdit ? 'Save Changes' : 'Create Role'}
            variant="primary"
            size="md"
            type="submit"
            formId="role-form"
            isLoading={isSubmitting}
          />
        </div>
      )}
    >
      <FormProvider {...methods}>
        <form
          id="role-form"
          onSubmit={methods.handleSubmit(onSubmit)}
          className="role-drawer-form"
          noValidate
        >
          <div className="role-drawer-form__dept-badge">
            Target Department:
            {' '}
            <strong>{groupName}</strong>
          </div>

          <FormInput
            name="name"
            label="Role Title"
            placeholder="e.g. Senior Wealth Advisor"
            id="role-drawer-name"
          />

          <FormTextArea
            name="description"
            label="Role Description (Optional)"
            placeholder="Define key responsibilities and access scope..."
            id="role-drawer-description"
          />
        </form>
      </FormProvider>
    </Drawer>
  );
}
