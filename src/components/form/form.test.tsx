// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { formSubmitHandler, useAppForm } from './index'

afterEach(() => {
  cleanup()
})

describe('TanStack app form fields', () => {
  it('binds invalid state and error descriptions to registered input and select fields', async () => {
    const handleSubmit = vi.fn()

    function DemoForm() {
      const form = useAppForm({
        defaultValues: {
          category: '',
          name: '',
        },
        validators: {
          onChange: z.object({
            category: z.string().min(1, 'Category is required'),
            name: z.string().min(1, 'Name is required'),
          }),
        },
        onSubmit: handleSubmit,
      })

      return (
        <form onSubmit={formSubmitHandler(form.handleSubmit)}>
          <form.AppField name='name'>{(field) => <field.TextField label='Name' />}</form.AppField>
          <form.AppField name='category'>
            {(field) => (
              <field.SelectField
                label='Category'
                placeholder='Pick category'
                options={[{ label: 'News', value: 'news' }]}
              />
            )}
          </form.AppField>
          <button type='submit'>Submit</button>
        </form>
      )
    }

    render(<DemoForm />)
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

    await waitFor(() => {
      expect(screen.getByLabelText('Name').getAttribute('aria-invalid')).toBe('true')
      expect(screen.getByRole('combobox', { name: 'Category' }).getAttribute('aria-invalid')).toBe(
        'true',
      )
    })

    const nameInput = screen.getByLabelText('Name')
    const categoryTrigger = screen.getByRole('combobox', { name: 'Category' })

    // Ids are instance-scoped via useId; assert the aria wiring, not literal values.
    expect(nameInput.getAttribute('aria-describedby')).toBe(
      screen.getByText('Name is required').getAttribute('id'),
    )
    expect(categoryTrigger.getAttribute('aria-describedby')).toBe(
      screen.getByText('Category is required').getAttribute('id'),
    )
    expect(handleSubmit).not.toHaveBeenCalled()
  })

  it('keeps field errors hidden until blur during form-level change validation', async () => {
    function DemoForm() {
      const form = useAppForm({
        defaultValues: {
          category: '',
          name: '',
        },
        validators: {
          onChange: z.object({
            category: z.string().min(1, 'Category is required'),
            name: z.string().min(1, 'Name is required'),
          }),
        },
        onSubmit: vi.fn(),
      })

      return (
        <form onSubmit={formSubmitHandler(form.handleSubmit)}>
          <form.AppField name='name'>{(field) => <field.TextField label='Name' />}</form.AppField>
          <form.AppField name='category'>
            {(field) => (
              <field.SelectField
                label='Category'
                placeholder='Pick category'
                options={[{ label: 'News', value: 'news' }]}
              />
            )}
          </form.AppField>
          <button type='submit'>Submit</button>
        </form>
      )
    }

    render(<DemoForm />)

    const nameInput = screen.getByLabelText('Name')
    const categoryTrigger = screen.getByRole('combobox', { name: 'Category' })

    fireEvent.change(nameInput, { target: { value: 'A' } })
    fireEvent.change(nameInput, { target: { value: '' } })

    expect(screen.queryByText('Name is required')).toBeNull()
    expect(nameInput.getAttribute('aria-invalid')).toBe('false')
    expect(categoryTrigger.getAttribute('aria-invalid')).toBe('false')

    fireEvent.blur(nameInput)

    await waitFor(() => {
      expect(screen.getByText('Name is required')).not.toBeNull()
    })

    expect(nameInput.getAttribute('aria-invalid')).toBe('true')
    expect(categoryTrigger.getAttribute('aria-invalid')).toBe('false')
    expect(screen.queryByText('Category is required')).toBeNull()
  })

  it('does not surface errors when a field is only tabbed through without input', () => {
    function DemoForm() {
      const form = useAppForm({
        defaultValues: {
          name: '',
        },
        validators: {
          onChange: z.object({
            name: z.string().min(1, 'Name is required'),
          }),
        },
        onSubmit: vi.fn(),
      })

      return (
        <form onSubmit={formSubmitHandler(form.handleSubmit)}>
          <form.AppField name='name'>{(field) => <field.TextField label='Name' />}</form.AppField>
        </form>
      )
    }

    render(<DemoForm />)

    const nameInput = screen.getByLabelText('Name')

    fireEvent.blur(nameInput)

    expect(screen.queryByText('Name is required')).toBeNull()
    expect(nameInput.getAttribute('aria-invalid')).toBe('false')
  })

  it('focuses the first invalid control after a failed submit', async () => {
    function DemoForm() {
      const form = useAppForm({
        defaultValues: {
          category: '',
          name: '',
        },
        validators: {
          onChange: z.object({
            category: z.string().min(1, 'Category is required'),
            name: z.string().min(1, 'Name is required'),
          }),
        },
        onSubmit: vi.fn(),
      })

      return (
        <form onSubmit={formSubmitHandler(form.handleSubmit)}>
          <form.AppField name='name'>{(field) => <field.TextField label='Name' />}</form.AppField>
          <form.AppField name='category'>
            {(field) => (
              <field.SelectField
                label='Category'
                placeholder='Pick category'
                options={[{ label: 'News', value: 'news' }]}
              />
            )}
          </form.AppField>
          <button type='submit'>Submit</button>
        </form>
      )
    }

    render(<DemoForm />)
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

    const nameInput = screen.getByLabelText('Name')

    await waitFor(() => {
      expect(document.activeElement).toBe(nameInput)
    })
  })

  it('displays the selected option label instead of the raw value', async () => {
    function DemoForm() {
      const form = useAppForm({
        defaultValues: {
          category: '',
        },
        onSubmit: vi.fn(),
      })

      return (
        <form onSubmit={formSubmitHandler(form.handleSubmit)}>
          <form.AppField name='category'>
            {(field) => (
              <field.SelectField
                label='Category'
                placeholder='Pick category'
                options={[
                  { label: 'Delivery Requirements', value: 'delivery_requirements' },
                  { label: 'FAQ', value: 'faq' },
                ]}
              />
            )}
          </form.AppField>
        </form>
      )
    }

    render(<DemoForm />)

    const categoryTrigger = screen.getByRole('combobox', { name: 'Category' })
    fireEvent.click(categoryTrigger)

    const option = await screen.findByRole('option', { name: 'Delivery Requirements' })
    fireEvent.click(option)

    await waitFor(() => {
      expect(categoryTrigger.textContent).toContain('Delivery Requirements')
      expect(categoryTrigger.textContent).not.toContain('delivery_requirements')
    })
  })

  it('uses external pending state in registered submit buttons', () => {
    function DemoForm() {
      const form = useAppForm({
        defaultValues: {
          name: '',
        },
        onSubmit: vi.fn(),
      })

      return (
        <form.AppForm>
          <form.SubmitButton
            pending
            pendingLabel='Saving'
            type='submit'
          >
            Save
          </form.SubmitButton>
        </form.AppForm>
      )
    }

    render(<DemoForm />)

    const submitButton = screen.getByRole('button', { name: 'Saving' })

    expect(submitButton.hasAttribute('disabled')).toBe(true)
  })

  it('submits the form from SubmitButton without an explicit type', async () => {
    const handleSubmit = vi.fn()

    function DemoForm() {
      const form = useAppForm({
        defaultValues: {
          name: 'ok',
        },
        onSubmit: handleSubmit,
      })

      return (
        <form onSubmit={formSubmitHandler(() => form.handleSubmit())}>
          <form.AppForm>
            <form.SubmitButton>Save</form.SubmitButton>
          </form.AppForm>
        </form>
      )
    }

    render(<DemoForm />)

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledTimes(1)
    })
  })

  it('toggles password field visibility from the trailing icon button', () => {
    function DemoForm() {
      const form = useAppForm({
        defaultValues: {
          password: 'secret',
        },
        onSubmit: vi.fn(),
      })

      return (
        <form.AppField name='password'>
          {(field) => (
            <field.PasswordField
              label='Password'
              toggleLabel='Toggle password visibility'
            />
          )}
        </form.AppField>
      )
    }

    render(<DemoForm />)

    const passwordInput = screen.getByLabelText('Password')
    const toggleButton = screen.getByRole('button', { name: 'Toggle password visibility' })

    expect(passwordInput.getAttribute('type')).toBe('password')

    fireEvent.click(toggleButton)

    expect(passwordInput.getAttribute('type')).toBe('text')

    fireEvent.click(toggleButton)

    expect(passwordInput.getAttribute('type')).toBe('password')
  })
})
