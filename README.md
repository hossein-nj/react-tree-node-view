# react-tree-node-view

<div align="center">

![React](https://img.shields.io/badge/React-%3E%3D18.2.0-61dafb?style=flat-square&logo=react&logoColor=20232a)
![TypeScript](https://img.shields.io/badge/TypeScript-first-3178c6?style=flat-square&logo=typescript&logoColor=white)
![NPM Version](https://img.shields.io/npm/v/react-tree-node-view?style=flat-square&logo=npm&color=cb3837)
![Monthly Downloads](https://img.shields.io/npm/dm/react-tree-node-view?style=flat-square&logo=npm&color=blue)
![Bundle Size](https://img.shields.io/bundlephobia/minzip/react-tree-node-view?style=flat-square&color=10b981)

</div>

A lightweight, dependency-free React tree view with selection, inline editing, drag-and-drop, and node management.

<div align="center">
  <img src="./images/react-tree-node-view-demo.gif" alt="React Tree Node Demo" width="100%" />
</div>

## Installation

```bash
npm install react-tree-node-view
```

The component imports its scoped stylesheet automatically. You can also import it explicitly when your bundler handles CSS entry points:

```tsx
import "react-tree-node-view/styles.css";
```

## Quick start

```tsx
import { useState } from "react";
import { TreeView, type TreeNode } from "react-tree-node-view";

const initialItems: TreeNode[] = [
  {
    key: "products",
    title: "Products",
    children: [{ key: "books", title: "Books" }],
  },
];

export default function Example() {
  const [items, setItems] = useState(initialItems);

  return (
    <TreeView 
      items={items}
      onChange={setItems}
    />
  );
}
```

Click an editable title to rename it. Press Enter or move focus away to save; press Escape to cancel. Drag rows before, inside, or after another row to reorder them.

## Preview

### Light & Dark Themes

<p align="center">
  <img src="./images/Light.png" alt="Light Theme" width="49%" />
  <img src="./images/Dark.png" alt="Dark Theme" width="49%" />
</p>

### Custom Colors

Use the `defaultColor` prop to customize the primary color across the entire component.

```tsx
export default function CustomColorExample() {
  return (
    <TreeView
      defaultItems={categories}
      defaultColor="#8b5cf6"
      theme="light"
    />
  );
}
```

<p align="center">
  <img src="./images/Light-color.png" alt="Light Theme with Custom Color" width="49%" />
  <img src="./images/Dark-color.png" alt="Dark Theme with Custom Color" width="49%" />
</p>

The `defaultColor` prop customizes the primary color throughout the tree view, including buttons, icons, active states, hover effects, and focus indicators. It works with both light and dark themes.

## Selectable mode

Set `type="selectable"` to enable checkbox-based node selection.

```tsx
<TreeView
  type="selectable"
  defaultItems={initialItems}
  defaultChecked={[{ _id: "books", title: "Books" }]}
  onCheckedChange={(checked) => console.log(checked)}
/>
```

Selecting a child also includes its ancestors, matching the serialized `TreeItem[]` format used by the component.

<p align="center">
  <img src="./images/selectable.png" alt="Selectable Tree View" width="75%" />
</p>

## Custom icons and labels

Every built-in icon can be replaced with a `ReactNode`. Omitted icons continue to use the package's inline SVG defaults.

```tsx
import { TreeView, type TreeViewIcons } from "react-tree-node-view";

const icons: TreeViewIcons = {
  folder: <span aria-hidden="true">📁</span>,
  openFolder: <span aria-hidden="true">📂</span>,
  add: <span aria-hidden="true">＋</span>,
  delete: <span aria-hidden="true">×</span>,
};

<TreeView
  defaultItems={initialItems}
  icons={icons}
  labels={{
    addCategory: "Create category",
    defaultCategoryTitle: "Untitled category",
    before: "Above",
  }}
  direction="ltr"
/>
```

The `labels` prop allows you to customize individual text labels. English defaults are used for any omitted labels. Dynamic accessibility labels also support the `{title}` placeholder, for example `addChild: "Add {title} below"`.

The `direction` prop supports both `ltr` and `rtl` layouts, controlling indentation, text alignment, icon placement, actions, and drop indicators.

## Drop indicator colors

Customize the colors of drag-and-drop indicators using the `dropIndicatorColors` prop. It accepts an object with three optional properties:

- `before`: The color displayed when dropping a category above another category.
- `inside`: The color displayed when dropping a category inside another category.
- `after`: The color displayed when dropping a category below another category.

```tsx
<TreeView
  defaultItems={initialItems}
  dropIndicatorColors={{
    before: "#0ea5e9",
    inside: "#f59e0b",
    after: "#22c55e",
  }}
/>

Each color can be customized independently. Omitted values fall back to the package's default colors.
```

## API

All `TreeView` props are optional. When `items` or `checkedItems` is provided, that value is controlled; otherwise the corresponding `defaultItems` or `defaultChecked` value initializes internal state.

| Prop | Type | Description |
| --- | --- | --- |
| `items` | `TreeNode[]` | Optional controlled tree data. If omitted, the component uses `defaultItems` and internal state. |
| `defaultItems` | `TreeNode[]` | Optional initial data for an uncontrolled tree. Defaults to `[]`. |
| `type` | `"editable" \| "selectable"` | Enables editing and drag actions or checkboxes. Defaults to `"editable"`. |
| `onChange` | `(items: TreeNode[]) => void` | Optional callback called after tree data changes. |
| `defaultChecked` | `TreeItem[]` | Optional initial checked items in selectable mode. Defaults to `[]`. |
| `checkedItems` | `TreeItem[]` | Optional controlled checked items. If omitted, checked state is managed internally. |
| `onCheckedChange` | `(items: TreeItem[]) => void` | Optional callback called after selection changes. |
| `onTitleChange` | `(node, title) => void` | Optional callback called after an inline title edit. |
| `onDelete` | `(node) => void` | Optional callback called after a node is removed. |
| `height` | `number` | Optional maximum tree height in pixels. Applied as the shell's `max-height`; overflow is scrollable when needed. |
| `className` | `string` | Optional class name applied to the component root. |
| `defaultColor` | `string` | Optional CSS color used as the primary color in both themes, including the Add Category button, icons, active states, hover states, and focus indicators. |
| `theme` | `"light" \| "dark"` | Complete component theme. Defaults to `"light"`. |
| `direction` | `"ltr" \| "rtl"` | Layout direction. Defaults to `"ltr"`; use `"rtl"` for right-to-left layouts. |
| `icons` | `TreeViewIcons` | Optional ReactNode replacements for `expand`, `collapse`, `dragHandle`, `folder`, `openFolder`, `add`, `delete`, `check`, and `empty`. Defaults to inline SVG icons for omitted entries. |
| `labels` | `Partial<TreeViewLabels>` | Optional partial overrides for action text, tooltips, accessibility labels, default titles, drag guide labels, loading text, and empty-state text. Defaults to English labels. |
| `dropIndicatorColors` | `Partial<TreeViewDropIndicatorColors>` | Optional partial customization of `before`, `inside`, and `after` drop colors in rows and the guide legend. Defaults to blue `#3b82f6`, amber `#f59e0b`, and green `#10b981`. |
| `loading` | `boolean` | Shows the loading skeleton when `true`. Defaults to `false`. |
| `emptyMessage` | `ReactNode` | Optional replacement for the default `"No categories found"` message when there are no nodes. |
| `disabled` | `boolean` | Disables editing, selection, and drag actions when `true`. Defaults to `false`. |

## Checked items

Use the `checkedItems` prop to control the selected items externally. When provided, the checked state is controlled by the parent component. Otherwise, the component manages the checked state internally.

```tsx
const [checkedItems, setCheckedItems] = useState<TreeItem[]>([]);

<TreeView
  defaultItems={initialItems}
  checkedItems={checkedItems}
  onCheckedChange={setCheckedItems}
/>
```

## Selection change callback

Use `onCheckedChange` to receive the updated list of checked items whenever the selection changes.

```tsx
<TreeView
  defaultItems={initialItems}
  onCheckedChange={(items) => {
    console.log("Selected items:", items);
  }}
/>
```

## Title change callback

Use `onTitleChange` to track inline title edits. It receives the updated node and its new title.

```tsx
<TreeView
  defaultItems={initialItems}
  onTitleChange={(node, title) => {
    console.log("Updated node:", node);
    console.log("New title:", title);
  }}
/>
```

## Delete callback

Use `onDelete` to be notified whenever a category is deleted. It receives the deleted node.

```tsx
<TreeView
  defaultItems={initialItems}
  onDelete={(node) => {
    console.log("Deleted category:", node);
  }}
/>
```

## Loading state

Set `loading` to `true` to display the built-in loading skeleton while your categories are being loaded. It defaults to `false`.

```tsx
<TreeView
  defaultItems={initialItems}
  loading={isLoading}
/>
```

## Empty state message

Use `emptyMessage` to customize the content displayed when there are no categories. It accepts any `ReactNode`, so you can provide text, icons, or custom components. The default message is `"No categories found"`.

```tsx
<TreeView
  defaultItems={[]}
  emptyMessage={
    <div>
      <span>No categories yet.</span>
      <button onClick={() => console.log("Add category")}>
        Create your first category
      </button>
    </div>
  }
/>
```

## Development

```bash
npm install
npm run typecheck
npm run build
npm run pack:check
```
