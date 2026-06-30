"use client";

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import * as React from "react";
import { CheckIcon, ChevronRightIcon, DotFilledIcon } from "@radix-ui/react-icons";
import "./dropdown-menu.css";

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuGroup = DropdownMenuPrimitive.Group;
const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
const DropdownMenuSub = DropdownMenuPrimitive.Sub;
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

const DropdownMenuSubTrigger = React.forwardRef(({ className = "", inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={`dropdown-menu-sub-trigger ${inset ? 'pl-8' : ''} ${className}`}
    {...props}
  >
    {children}
    <ChevronRightIcon style={{ marginLeft: 'auto', color: 'rgba(100,116,139,0.8)' }} />
  </DropdownMenuPrimitive.SubTrigger>
));
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName;

const DropdownMenuSubContent = React.forwardRef(({ className = "", ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={`dropdown-menu-sub-content ${className}`}
    {...props}
  />
));
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName;

const DropdownMenuContent = React.forwardRef(
  ({ className = "", sideOffset = 4, onPointerDown, onPointerDownOutside, onCloseAutoFocus, ...props }, ref) => {
    const isCloseFromMouse = React.useRef(false);

    const handlePointerDown = React.useCallback((e) => {
      isCloseFromMouse.current = true;
      onPointerDown?.(e);
    }, [onPointerDown]);

    const handlePointerDownOutside = React.useCallback((e) => {
      isCloseFromMouse.current = true;
      onPointerDownOutside?.(e);
    }, [onPointerDownOutside]);

    const handleCloseAutoFocus = React.useCallback((e) => {
      if (onCloseAutoFocus) return onCloseAutoFocus(e);
      if (!isCloseFromMouse.current) return;
      e.preventDefault();
      isCloseFromMouse.current = false;
    }, [onCloseAutoFocus]);

    return (
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          ref={ref}
          sideOffset={sideOffset}
          className={`dropdown-menu-content ${className}`}
          onPointerDown={handlePointerDown}
          onPointerDownOutside={handlePointerDownOutside}
          onCloseAutoFocus={handleCloseAutoFocus}
          {...props}
        />
      </DropdownMenuPrimitive.Portal>
    );
  }
);
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

const DropdownMenuItem = React.forwardRef(({ className = "", inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={`dropdown-menu-item ${inset ? 'pl-8' : ''} ${className}`}
    {...props}
  />
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const DropdownMenuCheckboxItem = React.forwardRef(({ className = "", children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={`dropdown-menu-item pl-8 ${className}`}
    checked={checked}
    {...props}
  >
    <span style={{ position: 'absolute', left: '0.5rem', display: 'flex', alignItems: 'center' }}>
      <DropdownMenuPrimitive.ItemIndicator>
        <CheckIcon width={16} height={16} />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName;

const DropdownMenuRadioItem = React.forwardRef(({ className = "", children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={`dropdown-menu-item pl-8 ${className}`}
    {...props}
  >
    <span style={{ position: 'absolute', left: '0.5rem', display: 'flex', alignItems: 'center' }}>
      <DropdownMenuPrimitive.ItemIndicator>
        <DotFilledIcon width={16} height={16} />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
));
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

const DropdownMenuLabel = React.forwardRef(({ className = "", inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={`dropdown-menu-label ${inset ? 'pl-8' : ''} ${className}`}
    {...props}
  />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

const DropdownMenuSeparator = React.forwardRef(({ className = "", ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={`dropdown-menu-separator ${className}`}
    {...props}
  />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

const DropdownMenuShortcut = ({ className = "", ...props }) => {
  return (
    <span
      className={className}
      style={{ marginLeft: 'auto', fontSize: '0.75rem', opacity: 0.6 }}
      {...props}
    />
  );
};
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
};
