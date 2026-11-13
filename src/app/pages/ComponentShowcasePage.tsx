import { useState, type ReactNode } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/feedback/EmptyState';
import { LoadingState } from '@/components/feedback/LoadingState';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  DropdownMenu,
  Input,
  Modal,
  RadioGroup,
  Select,
  Separator,
  Skeleton,
  Spinner,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableEmptyState,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  Tooltip,
  useToast,
} from '@/components/ui';
import { DashboardLayout } from '@/layouts/DashboardLayout';

function ShowcaseSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="showcase-section" id={id} aria-labelledby={`${id}-title`}>
      <header className="showcase-section__header">
        <h2 id={`${id}-title`}>{title}</h2>
        {description && <p>{description}</p>}
      </header>
      {children}
    </section>
  );
}

export function ComponentShowcasePage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { showToast } = useToast();

  const sidebar = (
    <>
      <a href="#buttons">Buttons</a>
      <a href="#forms">Forms</a>
      <a href="#feedback">Feedback</a>
      <a href="#overlays">Overlays</a>
      <a href="#data-display">Data display</a>
    </>
  );

  return (
    <DashboardLayout
      title="UI foundation preview"
      sidebarBrand={
        <div className="showcase-brand">
          <span className="brand-mark" aria-hidden="true">
            A
          </span>
          <span>AccessFlow</span>
        </div>
      }
      sidebar={sidebar}
      headerActions={<Badge variant="information">Development preview</Badge>}
    >
      <div className="showcase-page">
        <PageHeader
          eyebrow="Design system"
          title="Component showcase"
          description="Reusable, accessible building blocks for a consistent application experience."
        />

        <Alert variant="information" title="Development-only preview">
          The examples below demonstrate generic interface components and contain no application
          data.
        </Alert>

        <ShowcaseSection
          id="buttons"
          title="Buttons and status"
          description="Button variants, sizes, loading and disabled states, and semantic badges."
        >
          <Card
            title="Button variants"
            description="Use clear labels and reserve destructive styling for irreversible actions."
          >
            <div className="showcase-row">
              <Button>Primary action</Button>
              <Button variant="secondary">Secondary action</Button>
              <Button variant="outline">Outline action</Button>
              <Button variant="ghost">Quiet action</Button>
              <Button variant="destructive">Destructive action</Button>
              <Button loading>Loading</Button>
              <Button disabled>Disabled</Button>
            </div>
            <Separator />
            <div className="showcase-row">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
              <Badge>Default</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="error">Error</Badge>
              <Badge variant="information">Information</Badge>
            </div>
          </Card>
        </ShowcaseSection>

        <ShowcaseSection
          id="forms"
          title="Form controls"
          description="Labels, helper text, invalid states, required indicators, and keyboard-native controls."
        >
          <Card title="Input controls">
            <div className="showcase-form-grid">
              <Input
                label="Text field"
                placeholder="Enter text"
                helperText="Supporting guidance appears here."
              />
              <Input label="Required field" placeholder="Enter a value" required />
              <Input
                label="Invalid field"
                placeholder="Enter a value"
                error="Review the value and try again."
              />
              <Select
                label="Select menu"
                placeholder="Choose a size"
                options={[
                  { value: 'compact', label: 'Compact' },
                  { value: 'comfortable', label: 'Comfortable' },
                  { value: 'spacious', label: 'Spacious' },
                ]}
              />
              <div className="showcase-form-grid__wide">
                <Input label="Search field" type="search" placeholder="Search components" />
              </div>
              <div className="showcase-form-grid__wide">
                <RadioGroup
                  label="Display density"
                  name="showcase-density"
                  defaultValue="comfortable"
                  options={[
                    {
                      value: 'compact',
                      label: 'Compact',
                      description: 'More content in less space.',
                    },
                    {
                      value: 'comfortable',
                      label: 'Comfortable',
                      description: 'Balanced spacing for everyday use.',
                    },
                  ]}
                />
              </div>
              <Checkbox
                label="Enable optional setting"
                helperText="This is an example of supporting guidance."
              />
              <Switch
                label="Example preference"
                description="Switches support mouse, touch, and keyboard interaction."
                defaultChecked
              />
            </div>
          </Card>
        </ShowcaseSection>

        <ShowcaseSection
          id="feedback"
          title="Feedback and loading"
          description="Consistent status messages and progress indicators."
        >
          <div className="showcase-grid showcase-grid--two">
            <Card title="Alerts">
              <div className="showcase-stack">
                <Alert variant="success" title="Completed">
                  The example action finished successfully.
                </Alert>
                <Alert variant="warning" title="Attention">
                  Check the details before continuing.
                </Alert>
                <Alert variant="error" title="Unable to continue">
                  Review the information and retry.
                </Alert>
              </div>
            </Card>
            <Card title="Progress indicators">
              <div className="showcase-row">
                <Spinner label="Loading example" />
                <Skeleton width="8rem" />
                <Skeleton variant="circle" width="2.5rem" height="2.5rem" />
                <Skeleton variant="rect" width="6rem" height="3rem" />
              </div>
              <Separator />
              <LoadingState label="Loading preview content" />
            </Card>
            <Card title="Empty state">
              <EmptyState
                title="Nothing to display yet"
                description="When content is available, it will appear in this space."
                action={
                  <Button variant="outline" size="sm">
                    Example action
                  </Button>
                }
              />
            </Card>
            <Card
              title="Notifications"
              description="Toast notifications announce updates without interrupting the page."
            >
              <div className="showcase-row">
                <Button onClick={() => showToast({ title: 'Changes saved', variant: 'success' })}>
                  Show success toast
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    showToast({
                      title: 'Action needs attention',
                      description: 'Review the example details.',
                      variant: 'warning',
                    })
                  }
                >
                  Show warning toast
                </Button>
              </div>
            </Card>
          </div>
        </ShowcaseSection>

        <ShowcaseSection
          id="overlays"
          title="Menus, tabs, and dialogs"
          description="Keyboard-aware interaction primitives that preserve focus and clear labeling."
        >
          <Card title="Interactive controls">
            <div className="showcase-row">
              <DropdownMenu
                label="Example actions"
                trigger="Open menu"
                items={[
                  {
                    label: 'First action',
                    onSelect: () => showToast({ title: 'First action selected' }),
                  },
                  {
                    label: 'Second action',
                    onSelect: () => showToast({ title: 'Second action selected' }),
                  },
                  { label: 'Unavailable action', onSelect: () => undefined, disabled: true },
                ]}
              />
              <Button variant="outline" onClick={() => setDialogOpen(true)}>
                Open dialog
              </Button>
              <Tooltip label="Additional information about this action">
                <Button variant="ghost" aria-label="More information">
                  i
                </Button>
              </Tooltip>
            </div>
            <Separator />
            <Tabs
              label="Example content panels"
              items={[
                { id: 'first', label: 'First tab', content: <p>Content for the first panel.</p> },
                {
                  id: 'second',
                  label: 'Second tab',
                  content: <p>Content for the second panel.</p>,
                },
                {
                  id: 'disabled',
                  label: 'Unavailable',
                  content: <p>This panel is unavailable.</p>,
                  disabled: true,
                },
              ]}
            />
          </Card>
          <Modal
            open={dialogOpen}
            title="Example dialog"
            description="Dialogs are labeled, dismissible with Escape, and keep focus within the browser modal."
            onOpenChange={setDialogOpen}
            footer={
              <>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setDialogOpen(false);
                    showToast({ title: 'Example confirmed', variant: 'success' });
                  }}
                >
                  Confirm example
                </Button>
              </>
            }
          >
            <p>This is generic dialog content for demonstrating layout and focus behavior.</p>
          </Modal>
        </ShowcaseSection>

        <ShowcaseSection
          id="data-display"
          title="Data display"
          description="Reusable table primitives, avatars, separators, and card composition."
        >
          <Card title="Table primitives">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader scope="col">Component</TableHeader>
                  <TableHeader scope="col">Purpose</TableHeader>
                  <TableHeader scope="col">Status</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableHeader scope="row">Button</TableHeader>
                  <TableCell>Triggers an action</TableCell>
                  <TableCell>
                    <Badge variant="success">Ready</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableHeader scope="row">Card</TableHeader>
                  <TableCell>Groups related content</TableCell>
                  <TableCell>
                    <Badge variant="success">Ready</Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
          <Card title="Empty table state">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader scope="col">Component</TableHeader>
                  <TableHeader scope="col">Purpose</TableHeader>
                  <TableHeader scope="col">Status</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableEmptyState colSpan={3}>
                  An empty state can be rendered inside a table.
                </TableEmptyState>
              </TableBody>
            </Table>
          </Card>
          <div className="showcase-grid showcase-grid--two">
            <Card title="Avatar fallback">
              <div className="showcase-row">
                <Avatar name="AccessFlow Design" size="sm" />
                <Avatar name="Component Preview" />
                <Avatar name="System Foundations" size="lg" />
              </div>
            </Card>
            <Card title="Layout primitives">
              <div className="showcase-row">
                <span>Content item</span>
                <Separator orientation="vertical" decorative />
                <span>Related item</span>
                <Separator orientation="vertical" decorative />
                <span>Additional item</span>
              </div>
            </Card>
          </div>
        </ShowcaseSection>
      </div>
    </DashboardLayout>
  );
}
